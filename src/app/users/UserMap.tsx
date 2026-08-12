"use client";

import { useRef, useState } from "react";
import MapView from "@/components/MapView";
import PinDetailModal, { type PinEditPatch } from "@/components/PinDetailModal";
import { useAuth } from "@/components/AuthProvider";
import { usePinMutations } from "@/lib/usePinMutations";
import { reverseGeocode } from "@/lib/geocode";
import type { MapPin } from "@/lib/pin";

export default function UserMap({ pins }: { pins: MapPin[] }) {
  const { user, loading } = useAuth();
  const { updatePin, deletePin } = usePinMutations();

  // Local mirror of server pins — kept in sync by optimistic updates from
  // the mutation hook. Server-driven prop changes after a refresh are picked
  // up by the parent re-mounting this component (next page load).
  const [localPins, setLocalPins] = useState<MapPin[]>(pins);
  const [active, setActive] = useState<MapPin | null>(null);
  const [relocating, setRelocating] = useState(false);
  const [flyTo, setFlyTo] = useState<{
    center: [number, number];
    zoom?: number;
    nonce: number;
  } | null>(null);
  const flyNonceRef = useRef(0);

  const canEditActive =
    !loading && Boolean(user && active && active.owner_id === user.id);

  const center = localPins.length ? [localPins[0].lng, localPins[0].lat] : undefined;

  async function handleMapClick(lng: number, lat: number) {
    if (!relocating || !active) return;
    setRelocating(false);
    const place = await reverseGeocode(lat, lng);
    setActive({
      ...active,
      lat,
      lng,
      city: place.city,
      country: place.country,
    });
    flyNonceRef.current += 1;
    setFlyTo({ center: [lng, lat], zoom: 14, nonce: flyNonceRef.current });
  }

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
          initialCenter={center as [number, number] | undefined}
          initialZoom={6}
          onMapClick={relocating ? handleMapClick : undefined}
          onPinClick={(pin) => setActive(pin)}
          flyTo={flyTo ?? undefined}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {localPins.map((p) => (
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
              <p className="truncate text-xs text-stone-500 dark:text-stone-400">
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
          onClose={() => {
            setActive(null);
            setRelocating(false);
          }}
          onSave={canEditActive ? handleSave : undefined}
          onDelete={canEditActive ? handleDelete : undefined}
          onRelocate={canEditActive ? () => setRelocating((v) => !v) : undefined}
          relocating={relocating}
        />
      )}
    </>
  );
}