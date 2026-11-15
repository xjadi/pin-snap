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
  countryFlag,
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
      {/* Section Header + Clear-filter luggage tag */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="font-typewriter text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">
          {t("Landing.sectionMapLabel")}
        </span>
        {activeFilter && (
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
        )}
      </div>

      {/* Map in a taped polaroid frame */}
      <div ref={mapAnchorRef} className="polaroid relative scroll-mt-20">
        {/* Corner Scotch tape strips */}
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
            initialZoom={5}
            onPinClick={(pin) => setActive(pin)}
            fitBounds={fitBoundsState ?? undefined}
            className="h-[52vh] w-full"
          />
        </div>

        {localPins.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-2.5">
            <p className="font-typewriter text-xs font-bold text-ink-muted">
              📌{" "}
              {activeFilter
                ? t("Map.filteredOnMap", {
                    shown: filteredPins.length,
                    total: localPins.length,
                  })
                : t("Map.memoriesOnMap", { count: localPins.length })}
            </p>
            <span className="font-typewriter text-[10px] uppercase tracking-widest text-ink-muted/80">
              CARTO · VOYAGER FIELD CHART
            </span>
          </div>
        )}
      </div>

      {/* Masonry taped polaroid grid */}
      {filteredPins.length > 0 && (
        <div className="mt-10">
          <div className="mb-4 flex items-center gap-3">
            <span className="font-typewriter text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">
              {t("Landing.sectionPolaroidsLabel")}
            </span>
            <span className="h-px flex-1 border-t border-dashed border-border" />
          </div>
          <div className="columns-2 gap-5 sm:columns-3">
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
        </div>
      )}

      {/* Summary — Library Running Log Index Card */}
      {summary && title && (
        <div className="mt-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="font-typewriter text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">
              {t("Landing.sectionLogLabel")}
            </span>
            <span className="h-px flex-1 border-t border-dashed border-border" />
          </div>
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
          onClose={() => setActive(null)}
          onSave={canEditActive ? handleSave : undefined}
          onDelete={canEditActive ? handleDelete : undefined}
        />
      )}
    </>
  );
}
