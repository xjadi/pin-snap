"use client";

import { useMemo, useRef, useState } from "react";
import MapView from "@/components/MapView";
import PinDetailModal, { type PinEditPatch } from "@/components/PinDetailModal";
import { PolaroidCard } from "@/components/PolaroidCard";
import SummaryPanel from "@/components/SummaryPanel";
import { useAuth } from "@/components/AuthProvider";
import { usePinMutations } from "@/lib/usePinMutations";
import { reverseGeocode } from "@/lib/geocode";
import {
  filterPins,
  pinsBounds,
  type MapPin,
  type PinFilter,
  type PinSummary,
} from "@/lib/pin";

export default function UserMap({
  pins,
  summary,
  title,
  locale = "en",
}: {
  pins: MapPin[];
  summary?: PinSummary;
  title?: string;
  locale?: string;
}) {
  const { user, loading } = useAuth();
  const { updatePin, deletePin } = usePinMutations();

  const [localPins, setLocalPins] = useState<MapPin[]>(pins);
  const [active, setActive] = useState<MapPin | null>(null);
  const [relocating, setRelocating] = useState(false);
  const [flyTo, setFlyTo] = useState<{
    center: [number, number];
    zoom?: number;
    nonce: number;
  } | null>(null);
  const flyNonceRef = useRef(0);

  const [activeFilter, setActiveFilter] = useState<PinFilter | null>(null);
  const fitNonceRef = useRef(0);
  const [fitBoundsState, setFitBoundsState] = useState<{
    bounds: [[number, number], [number, number]];
    nonce: number;
  } | null>(null);

  const filteredPins = useMemo(
    () => filterPins(localPins, activeFilter),
    [localPins, activeFilter],
  );

  const canEditActive =
    !loading && Boolean(user && active && active.owner_id === user.id);

  const center = localPins.length
    ? [localPins[0].lng, localPins[0].lat]
    : undefined;

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

  function applyFilter(f: PinFilter | null) {
    setActiveFilter(f);
    if (f) {
      const next = filterPins(localPins, f);
      const bounds = pinsBounds(next);
      if (bounds) {
        fitNonceRef.current += 1;
        setFitBoundsState({ bounds, nonce: fitNonceRef.current });
      }
    } else {
      setFitBoundsState(null);
    }
  }

  return (
    <>
      {summary && title && (
        <div className="mb-6">
          <SummaryPanel
            pins={localPins}
            summary={summary}
            title={title}
            locale={locale}
            activeFilter={activeFilter}
            onFilter={applyFilter}
          />
        </div>
      )}

      {/* Clear-filter chip */}
      {activeFilter && (
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => applyFilter(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-magenta/10 px-3 py-1 text-sm font-medium text-magenta transition hover:bg-magenta/20"
          >
            {activeFilter.value} ✕
          </button>
        </div>
      )}

      <div className="polaroid">
        <MapView
          pins={filteredPins}
          initialCenter={center as [number, number] | undefined}
          initialZoom={6}
          onMapClick={relocating ? handleMapClick : undefined}
          onPinClick={(pin) => setActive(pin)}
          flyTo={flyTo ?? undefined}
          fitBounds={fitBoundsState ?? undefined}
          className="h-[50vh] w-full"
        />
      </div>

      {/* Masonry polaroid grid */}
      <div className="mt-8 columns-2 gap-4 sm:columns-3">
        {filteredPins.map((p, i) => (
          <PolaroidCard
            key={p.id}
            pin={p}
            index={i}
            onClick={() => setActive(p)}
          />
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