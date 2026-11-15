"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { MapPin } from "@/lib/pin";

// Centered on Thailand by default.
const THAILAND_CENTER = { lng: 100.5018, lat: 13.7563 };

interface MapViewProps {
  pins: MapPin[];
  initialCenter?: [number, number];
  initialZoom?: number;
  onMapClick?: (lng: number, lat: number) => void;
  onPinClick?: (pin: MapPin) => void;
  className?: string;
  flyTo?: { center: [number, number]; zoom?: number; nonce: number };
  fitBounds?: {
    bounds: [[number, number], [number, number]];
    nonce: number;
  };
}

// CARTO basemap styles. Since Aug 2026 CARTO watermarks raster (PNG) tiles
// served without an API key and is retiring the raster service, so we use
// their vector (GL) styles instead — sharper on retina, same cartography
// families (Voyager light / Dark Matter dark). An optional free key from
// https://carto.com/basemaps/apikey can be set via NEXT_PUBLIC_CARTO_API_KEY;
// CARTO plans to require it for vector too, so setting it is future-proof.
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY;

function basestyle(dark: boolean): string {
  const style = dark ? "dark-matter-gl-style" : "voyager-gl-style";
  const key = CARTO_KEY ? `?key=${encodeURIComponent(CARTO_KEY)}` : "";
  return `https://basemaps.cartocdn.com/gl/${style}/style.json${key}`;
}

export default function MapView({
  pins,
  initialCenter,
  initialZoom = 5,
  onMapClick,
  onPinClick,
  className = "h-[70vh] w-full",
  flyTo,
  fitBounds,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const activePopupRef = useRef<maplibregl.Popup | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupBoundRef = useRef<Set<string>>(new Set());
  const handlersRef = useRef({ onMapClick, onPinClick });
  const [ready, setReady] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  useEffect(() => {
    handlersRef.current = { onMapClick, onPinClick };
  }, [onMapClick, onPinClick]);

  // Initialise the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Turbopack does not emit maplibre-gl's separate worker chunk, so the
    // default worker URL resolution 404s and vector basemaps hang silently.
    // Point maplibre at the worker files we serve from /public instead
    // (kept in sync by the postinstall script).
    if (typeof window !== "undefined") {
      maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: basestyle(resolvedTheme === "dark"),
      center: (initialCenter ?? [
        THAILAND_CENTER.lng,
        THAILAND_CENTER.lat,
      ]) as [number, number],
      zoom: initialZoom,
      attributionControl: {
        compact: true,
        customAttribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );

    mapRef.current = map;

    map.on("click", (e: maplibregl.MapMouseEvent) => {
      handlersRef.current.onMapClick?.(e.lngLat.lng, e.lngLat.lat);
    });

    map.on("load", () => setReady(true));

    return () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
      popupBoundRef.current = new Set();
      clearCloseTimer();
      activePopupRef.current = null;
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap basemap when the theme changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const style = basestyle(isDark);
    map.setStyle(style);
  }, [isDark, ready]);

  // Fly to a requested location when flyTo.nonce changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !flyTo) return;
    map.flyTo({
      center: flyTo.center,
      zoom: flyTo.zoom ?? 14,
      duration: 800,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTo?.nonce, ready]);

  // Fit to a bounding box when fitBounds.nonce changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !fitBounds) return;
    map.fitBounds(fitBounds.bounds, {
      padding: 60,
      maxZoom: 14,
      duration: 800,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitBounds?.nonce, ready]);

  // Sync markers when pins change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const popupHtmlInner = (pin: MapPin) => {
      const popupBg = isDark ? "#1e1711" : "#fcf8f0";
      const popupText = isDark ? "#f6ede0" : "#1e1610";
      const popupMuted = isDark ? "#b09b82" : "#6b5844";
      const popupSub = isDark ? "#2a2017" : "#efe4ce";
      return `
        <div style="width:208px;overflow:hidden;border-radius:4px;background:${popupBg};padding:6px 6px 10px 6px;">
          <div style="height:118px;width:100%;background:${popupSub};overflow:hidden;">
            <img src="${escapeHtml(pin.photo_url)}" alt="pin" style="height:118px;width:100%;object-fit:cover;" onerror="this.style.opacity='0.2'" />
          </div>
          <div style="padding:6px 4px 0 4px;">
            <p style="margin:0;font-size:13px;font-weight:700;color:${popupText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(pin.title || pin.owner_display_name || "Pinner")}</p>
            <p style="margin:2px 0 0 0;font-family:monospace;font-size:11px;color:${popupMuted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📍 ${escapeHtml([pin.city, pin.country].filter(Boolean).join(", ") || "Pinned location")}</p>
          </div>
        </div>
      `;
    };

    const setUpMarker = (pin: MapPin) => {
      const el = document.createElement("button");
      // No transform on hover — keeps the hit box stable so the popup
      // doesn't flicker on enter/leave at marker edges.
      el.className =
        "flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-sun text-base shadow-lg transition hover:opacity-80 focus:outline-none";
      el.innerHTML = "📌";
      el.title = "Pin";

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 24,
        maxWidth: "240px",
      }).setHTML(popupHtmlInner(pin));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(popup)
        .addTo(map);

      const openPopup = () => {
        clearCloseTimer();
        if (activePopupRef.current && activePopupRef.current !== popup) {
          activePopupRef.current.remove();
        }
        if (!popup.isOpen()) {
          popup.addTo(map);
        }
        activePopupRef.current = popup;

        // Bind popup hover handlers once (after the element exists).
        if (!popupBoundRef.current.has(pin.id)) {
          const popupEl = popup.getElement();
          if (popupEl) {
            popupEl.addEventListener("mouseenter", clearCloseTimer);
            popupEl.addEventListener("mouseleave", () => {
              clearCloseTimer();
              closeTimerRef.current = setTimeout(() => {
                popup.remove();
                if (activePopupRef.current === popup) activePopupRef.current = null;
              }, 150);
            });
            popupBoundRef.current.add(pin.id);
          }
        }
      };

      el.addEventListener("mouseenter", openPopup);

      el.addEventListener("mouseleave", () => {
        clearCloseTimer();
        closeTimerRef.current = setTimeout(() => {
          popup.remove();
          if (activePopupRef.current === popup) activePopupRef.current = null;
        }, 150);
      });

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        clearCloseTimer();
        popup.remove();
        if (activePopupRef.current === popup) activePopupRef.current = null;
        handlersRef.current.onPinClick?.(pin);
      });

      return marker;
    };

    // Remove stale markers.
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (!pins.find((p) => p.id === id)) {
        marker.remove();
        delete markersRef.current[id];
        popupBoundRef.current.delete(id);
      }
    });

    pins.forEach((pin) => {
      if (!markersRef.current[pin.id]) {
        markersRef.current[pin.id] = setUpMarker(pin);
      } else {
        const existing = markersRef.current[pin.id];
        existing.setLngLat([pin.lng, pin.lat]);
        // Refresh popup HTML for theme/content changes without rebuilding
        // the popup (keeps the <img> element alive — no re-fetch flicker).
        existing.getPopup()?.setHTML(popupHtmlInner(pin));
      }
    });
  }, [pins, ready, isDark]);

  void initialCenter;
  void initialZoom;
  return <div ref={containerRef} className={className} />;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}