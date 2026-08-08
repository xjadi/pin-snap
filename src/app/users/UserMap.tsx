"use client";

import { useState } from "react";
import MapView from "@/components/MapView";
import PinDetailModal from "@/components/PinDetailModal";
import type { MapPin } from "@/lib/pin";

export default function UserMap({ pins }: { pins: MapPin[] }) {
  const [active, setActive] = useState<MapPin | null>(null);

  const center = pins.length
    ? [pins[0].lng, pins[0].lat]
    : undefined;

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-stone-200 shadow-sm">
        <MapView
          pins={pins}
          initialCenter={center as [number, number] | undefined}
          initialZoom={6}
          onPinClick={(pin) => setActive(pin)}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {pins.map((p) => (
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
              <p className="truncate text-xs text-stone-500">
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