"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import MapView from "@/components/MapView";
import PinDetailModal, { type PinEditPatch } from "@/components/PinDetailModal";
import { PolaroidCard } from "@/components/PolaroidCard";
import SummaryPanel from "@/components/SummaryPanel";
import { useAuth } from "@/components/AuthProvider";
import { usePinMutations } from "@/lib/usePinMutations";
import {
  filterPins,
  pinsBounds,
  type MapPin,
  type PinFilter,
  type PinSummary,
} from "@/lib/pin";

export default function HomeMap({
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
  const t = useTranslations();
  const { user, loading } = useAuth();
  const { updatePin, deletePin } = usePinMutations();

  const [localPins, setLocalPins] = useState<MapPin[]>(pins);
  const [active, setActive] = useState<MapPin | null>(null);
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

      {/* Map in a polaroid frame */}
      <div className="polaroid">
        <MapView
          pins={filteredPins}
          initialZoom={5}
          onPinClick={(pin) => setActive(pin)}
          fitBounds={fitBoundsState ?? undefined}
          className="h-[50vh] w-full"
        />
      </div>

      {localPins.length > 0 && (
        <p className="mt-3 text-center text-sm text-ink-muted">
          {activeFilter
            ? t("Map.filteredOnMap", {
                shown: filteredPins.length,
                total: localPins.length,
              })
            : t("Map.memoriesOnMap", { count: localPins.length })}
        </p>
      )}

      {/* Masonry polaroid grid */}
      {filteredPins.length > 0 && (
        <div className="mt-8 columns-2 gap-4 sm:columns-3">
          {filteredPins.slice(0, 9).map((p, i) => (
            <PolaroidCard
              key={p.id}
              pin={p}
              index={i}
              showOwner
              onClick={() => setActive(p)}
            />
          ))}
        </div>
      )}

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