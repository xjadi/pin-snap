"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
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
}

export default function MapView({
  pins,
  initialCenter,
  initialZoom = 5,
  onMapClick,
  onPinClick,
  className = "h-[70vh] w-full",
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const handlersRef = useRef({ onMapClick, onPinClick });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    handlersRef.current = { onMapClick, onPinClick };
  }, [onMapClick, onPinClick]);

  // Initialise the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          "carto-voyager": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          },
        },
        layers: [
          {
            id: "voyager",
            type: "raster",
            source: "carto-voyager",
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      },
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
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers when pins change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const setUpMarker = (pin: MapPin) => {
      const el = document.createElement("button");
      el.className =
        "flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-amber-500 text-base shadow-lg transition hover:scale-110 hover:bg-amber-600 focus:outline-none";
      el.innerHTML = "📌";
      el.title = "Pin";

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map);

      el.addEventListener("mouseenter", () => {
        popupRef.current?.remove();
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 24,
          maxWidth: "240px",
        }).setHTML(`
          <div class="w-[200px] overflow-hidden rounded-xl bg-white">
            <div class="h-28 w-full bg-stone-100">
              <img src="${escapeHtml(pin.photo_url)}" alt="pin" class="h-28 w-full object-cover" />
            </div>
            <div class="px-3 py-2">
              <p class="truncate text-sm font-semibold text-stone-800">${escapeHtml(pin.owner_display_name || "Pinner")}</p>
              <p class="truncate text-xs text-stone-500">${escapeHtml([pin.city, pin.country].filter(Boolean).join(", ") || "Pinned location")}</p>
            </div>
          </div>
        `);
        popup.setLngLat([pin.lng, pin.lat]).addTo(map);
        popupRef.current = popup;
      });

      el.addEventListener("mouseleave", () => {
        popupRef.current?.remove();
        popupRef.current = null;
      });

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        popupRef.current?.remove();
        popupRef.current = null;
        handlersRef.current.onPinClick?.(pin);
      });

      return marker;
    };

    // Remove stale markers.
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (!pins.find((p) => p.id === id)) {
        marker.remove();
        delete markersRef.current[id];
      }
    });

    pins.forEach((pin) => {
      if (!markersRef.current[pin.id]) {
        markersRef.current[pin.id] = setUpMarker(pin);
      } else {
        markersRef.current[pin.id].setLngLat([pin.lng, pin.lat]);
      }
    });
  }, [pins, ready]);

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