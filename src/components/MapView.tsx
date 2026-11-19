"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { MapPin } from "@/lib/pin";
import { formatScheduleRange, type JoinMePost } from "@/lib/joinMe";

// Centered on Thailand by default.
const THAILAND_CENTER = { lng: 100.5018, lat: 13.7563 };

interface MapViewProps {
  pins: MapPin[];
  joinMePosts?: JoinMePost[];
  draftMarker?: { lat: number; lng: number; label?: string } | null;
  locale?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  onMapClick?: (lng: number, lat: number) => void;
  onPinClick?: (pin: MapPin) => void;
  onJoinMeClick?: (post: JoinMePost) => void;
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

const JOIN_ME_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

export default function MapView({
  pins,
  joinMePosts = [],
  draftMarker = null,
  locale = "en",
  initialCenter,
  initialZoom = 5,
  onMapClick,
  onPinClick,
  onJoinMeClick,
  className = "h-[70vh] w-full",
  flyTo,
  fitBounds,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const joinMeMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const joinMeDataRef = useRef<Record<string, JoinMePost>>({});
  const draftMarkerRef = useRef<maplibregl.Marker | null>(null);
  const activePopupRef = useRef<maplibregl.Popup | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupBoundRef = useRef<Set<string>>(new Set());
  const handlersRef = useRef({ onMapClick, onPinClick, onJoinMeClick });
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
    handlersRef.current = { onMapClick, onPinClick, onJoinMeClick };
  }, [onMapClick, onPinClick, onJoinMeClick]);

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
      Object.values(joinMeMarkersRef.current).forEach((m) => m.remove());
      joinMeMarkersRef.current = {};
      joinMeDataRef.current = {};
      draftMarkerRef.current?.remove();
      draftMarkerRef.current = null;
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

  // Sync "Join Me" markers with a distinct emerald badge icon + dispatch popup.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const popupHtmlJoinMe = (post: JoinMePost) => {
      const popupBg = isDark ? "#1e1711" : "#fcf8f0";
      const popupText = isDark ? "#f6ede0" : "#1e1610";
      const popupMuted = isDark ? "#b09b82" : "#6b5844";
      const accent = post.status === "open"
        ? isDark ? "#36c275" : "#1b6b4c"
        : isDark ? "#7c6a58" : "#6b5844";
      const statusLabel = post.status === "open" ? "OPEN" : "CLOSED";
      const location = [post.city, post.country].filter(Boolean).join(", ");
      const schedule = formatScheduleRange(post.start_date, post.end_date, locale);
      return `
        <div style="width:228px;overflow:hidden;border-radius:6px;background:${popupBg};">
          <div style="height:5px;width:100%;background:${accent};"></div>
          <div style="padding:10px 11px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:5px;">
              <span style="font-family:monospace;font-size:10px;font-weight:700;letter-spacing:0.12em;color:${accent};">JOIN ME</span>
              <span style="font-family:monospace;font-size:9px;font-weight:700;letter-spacing:0.1em;padding:1px 5px;border:1px solid ${accent};border-radius:3px;color:${accent};">${statusLabel}</span>
            </div>
            <p style="margin:0;font-size:13px;font-weight:700;line-height:1.25;color:${popupText};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(post.title)}</p>
            <p style="margin:5px 0 0 0;font-family:monospace;font-size:11px;color:${popupMuted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📍 ${escapeHtml(location || "City")}</p>
            <p style="margin:2px 0 0 0;font-family:monospace;font-size:11px;font-weight:700;color:${popupText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📅 ${escapeHtml(schedule)}</p>
            <div style="margin-top:7px;padding-top:6px;border-top:1px dashed ${isDark ? "#3f3022" : "#d8c7a8"};display:flex;align-items:center;justify-content:space-between;gap:6px;font-family:monospace;font-size:10px;color:${popupMuted};">
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">@${escapeHtml(post.owner_display_name)}</span>
              <span style="flex-shrink:0;font-weight:700;color:${accent};">💬 ${post.reply_count}</span>
            </div>
          </div>
        </div>
      `;
    };

    const setUpJoinMeMarker = (post: JoinMePost) => {
      const el = document.createElement("button");
      el.type = "button";
      const isOpen = post.status === "open";
      // Distinct squircle emerald badge with travelers SVG — clearly different from circular yellow 📌 pins.
      el.className = `relative flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white text-white shadow-lg transition hover:opacity-85 focus:outline-none ${
        isOpen ? "bg-verde ring-2 ring-verde/45" : "bg-ink-muted ring-1 ring-ink-muted/35"
      }`;
      el.innerHTML = `${JOIN_ME_SVG}${
        isOpen
          ? '<span aria-hidden="true" class="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-sun"></span>'
          : ""
      }`;
      el.title = `Join Me: ${post.title}`;
      el.setAttribute("aria-label", `Join Me: ${post.title}`);

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 26,
        maxWidth: "250px",
      }).setHTML(popupHtmlJoinMe(post));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([post.lng, post.lat])
        .setPopup(popup)
        .addTo(map);

      const boundKey = `jm:${post.id}`;

      const openPopup = () => {
        clearCloseTimer();
        if (activePopupRef.current && activePopupRef.current !== popup) {
          activePopupRef.current.remove();
        }
        if (!popup.isOpen()) {
          popup.addTo(map);
        }
        activePopupRef.current = popup;

        if (!popupBoundRef.current.has(boundKey)) {
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
            popupBoundRef.current.add(boundKey);
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
        const latest = joinMeDataRef.current[post.id] ?? post;
        handlersRef.current.onJoinMeClick?.(latest);
      });

      return marker;
    };

    // Remove stale Join Me markers.
    Object.entries(joinMeMarkersRef.current).forEach(([id, marker]) => {
      if (!joinMePosts.find((p) => p.id === id)) {
        marker.remove();
        delete joinMeMarkersRef.current[id];
        delete joinMeDataRef.current[id];
        popupBoundRef.current.delete(`jm:${id}`);
      }
    });

    joinMePosts.forEach((post) => {
      joinMeDataRef.current[post.id] = post;
      if (!joinMeMarkersRef.current[post.id]) {
        joinMeMarkersRef.current[post.id] = setUpJoinMeMarker(post);
      } else {
        const existing = joinMeMarkersRef.current[post.id];
        existing.setLngLat([post.lng, post.lat]);
        const el = existing.getElement();
        const isOpen = post.status === "open";
        el.className = `relative flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white text-white shadow-lg transition hover:opacity-85 focus:outline-none ${
          isOpen ? "bg-verde ring-2 ring-verde/45" : "bg-ink-muted ring-1 ring-ink-muted/35"
        }`;
        el.innerHTML = `${JOIN_ME_SVG}${
          isOpen
            ? '<span aria-hidden="true" class="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-sun"></span>'
            : ""
        }`;
        existing.getPopup()?.setHTML(popupHtmlJoinMe(post));
      }
    });
  }, [joinMePosts, ready, isDark, locale]);

  // Sync optional draft marker (used when selecting a city in the Join Me composer).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (!draftMarker) {
      draftMarkerRef.current?.remove();
      draftMarkerRef.current = null;
      return;
    }

    if (!draftMarkerRef.current) {
      const el = document.createElement("div");
      el.className =
        "flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white bg-verde text-white shadow-lg ring-4 ring-verde/30";
      el.innerHTML = JOIN_ME_SVG;
      draftMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([draftMarker.lng, draftMarker.lat])
        .addTo(map);
    } else {
      draftMarkerRef.current.setLngLat([draftMarker.lng, draftMarker.lat]);
    }
  }, [draftMarker, ready]);

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