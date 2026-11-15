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
  countryFlag,
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
  const mapAnchorRef = useRef<HTMLDivElement | null>(null);
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
      // The summary lives below the map — bring the filtered result into view.
      mapAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setFitBoundsState(null);
    }
  }

  return (
    <>
      {/* Clear-filter luggage tag */}
      {activeFilter && (
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => applyFilter(null)}
            className="luggage-tag cursor-pointer transition hover:opacity-85"
          >
            {activeFilter.type === "country" && (
              <span aria-hidden>{countryFlag(activeFilter.value)}</span>
            )}
            <span>{activeFilter.value}</span>
            <span className="text-magenta">✕</span>
          </button>
        </div>
      )}

      <div ref={mapAnchorRef} className="polaroid relative scroll-mt-20">
        <div
          aria-hidden
          className="scotch-tape absolute -left-3 -top-3 z-10 h-6 w-20 -rotate-12"
        />
        <div
          aria-hidden
          className="scotch-tape absolute -right-3 -top-3 z-10 h-6 w-20 rotate-12"
        />

        <div className="overflow-hidden border border-border/60">
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
      </div>

      {/* Masonry polaroid grid */}
      <div className="mt-9 columns-2 gap-5 sm:columns-3">
        {filteredPins.map((p, i) => (
          <PolaroidCard
            key={p.id}
            pin={p}
            index={i}
            onClick={() => setActive(p)}
          />
        ))}
      </div>

      {/* Summary — below the thumbnails */}
      {summary && title && (
        <div className="mt-10">
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