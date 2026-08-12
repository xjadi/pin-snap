"use client";

import { useState } from "react";
import MapView from "@/components/MapView";
import PinDetailModal, { type PinEditPatch } from "@/components/PinDetailModal";
import { useAuth } from "@/components/AuthProvider";
import { usePinMutations } from "@/lib/usePinMutations";
import type { MapPin } from "@/lib/pin";

export default function HomeMap({ pins }: { pins: MapPin[] }) {
  const { user, loading } = useAuth();
  const { updatePin, deletePin } = usePinMutations();

  const [localPins, setLocalPins] = useState<MapPin[]>(pins);
  const [active, setActive] = useState<MapPin | null>(null);

  const canEditActive =
    !loading && Boolean(user && active && active.owner_id === user.id);

  async function handleSave(patch: PinEditPatch) {
    if (!active) return;
    await updatePin(active.id, patch, { setPins: setLocalPins, setActive });
  }

  async function handleDelete(id: string) {
    await deletePin(id, { setPins: setLocalPins, setActive });
  }

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-stone-200 shadow-sm dark:border-stone-800">
        <MapView
          pins={localPins}
          initialZoom={5}
          onPinClick={(pin) => setActive(pin)}
        />
      </div>

      {localPins.length > 0 && (
        <p className="mt-3 text-center text-sm text-stone-500 dark:text-stone-400">
          {localPins.length} pinned memor{localPins.length === 1 ? "y" : "ies"} on the map
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {localPins.slice(0, 8).map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p)}
            className="group overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="aspect-square w-full bg-stone-100 dark:bg-stone-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.photo_url}
                alt="pin"
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            </div>
            <div className="p-2">
              <p className="truncate text-xs font-medium text-stone-700 dark:text-stone-200">
                {p.owner_display_name}
              </p>
              <p className="truncate text-[11px] text-stone-400 dark:text-stone-500">
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
          canEdit={canEditActive}
          onClose={() => setActive(null)}
          onSave={canEditActive ? handleSave : undefined}
          onDelete={canEditActive ? handleDelete : undefined}
        />
      )}
    </>
  );
}