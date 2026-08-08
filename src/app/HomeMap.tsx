"use client";

import { useState } from "react";
import MapView from "@/components/MapView";
import PinDetailModal from "@/components/PinDetailModal";
import type { MapPin } from "@/lib/pin";

export default function HomeMap({ pins }: { pins: MapPin[] }) {
  const [active, setActive] = useState<MapPin | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-stone-200 shadow-sm">
        <MapView
          pins={pins}
          initialZoom={5}
          onPinClick={(pin) => setActive(pin)}
        />
      </div>

      {pins.length > 0 && (
        <p className="mt-3 text-center text-sm text-stone-500">
          {pins.length} pinned memor{pins.length === 1 ? "y" : "ies"} on the map
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {pins.slice(0, 8).map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p)}
            className="group overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="aspect-square w-full bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.photo_url}
                alt="pin"
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            </div>
            <div className="p-2">
              <p className="truncate text-xs font-medium text-stone-700">
                {p.owner_display_name}
              </p>
              <p className="truncate text-[11px] text-stone-400">
                {[p.city, p.country].filter(Boolean).join(", ") || "Pinned"}
              </p>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <PinDetailModal
          key={active.id}
          pin={active}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}