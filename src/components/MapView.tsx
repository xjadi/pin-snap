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
}

function basestyle(dark: boolean) {
  const tiles = dark
    ? [
        "https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png",
      ]
    : [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ];
  return {
    version: 8 as const,
    sources: {
      basemap: {
        type: "raster" as const,
        tiles,
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    layers: [
      {
        id: "tiles",
        type: "raster" as const,
        source: "basemap",
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  };
}

export default function MapView({
  pins,
  initialCenter,
  initialZoom = 5,
  onMapClick,
  onPinClick,
  className = "h-[70vh] w-full",
  flyTo,
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

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: basestyle(resolvedTheme === "dark"),
      center: (initialCenter ?? [
        THAILAND_CENTER.lng,
        THAILAND_CENTER.lat,
      ]) as [number, number],
      zoom: initialZoom,
      attributionControl: { compact: true },
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

  // Sync markers when pins change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const popupHtmlInner = (pin: MapPin) => {
      const popupBg = isDark ? "#1c1917" : "#ffffff";
      const popupText = isDark ? "#fafaf9" : "#1c1917";
      const popupMuted = isDark ? "#a8a29e" : "#78716c";
      const popupSub = isDark ? "#292524" : "#f5f5f4";
      return `
        <div style="width:200px;overflow:hidden;border-radius:12px;background:${popupBg};">
          <div style="height:112px;width:100%;background:${popupSub};">
            <img src="${escapeHtml(pin.photo_url)}" alt="pin" style="height:112px;width:100%;object-fit:cover;" />
          </div>
          <div style="padding:8px 12px;">
            <p style="margin:0;font-size:14px;font-weight:600;color:${popupText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(pin.owner_display_name || "Pinner")}</p>
            <p style="margin:0;font-size:12px;color:${popupMuted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml([pin.city, pin.country].filter(Boolean).join(", ") || "Pinned location")}</p>
          </div>
        </div>
      `;
    };

    const setUpMarker = (pin: MapPin) => {
      const el = document.createElement("button");
      // No transform on hover — keeps the hit box stable so the popup
      // doesn't flicker on enter/leave at marker edges.
      el.className =
        "flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-amber-500 text-base shadow-lg transition hover:bg-amber-600 focus:outline-none";
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