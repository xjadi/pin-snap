"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import MapView from "@/components/MapView";
import PinDetailModal, { type PinEditPatch } from "@/components/PinDetailModal";
import JoinMeDetailModal from "@/components/JoinMeDetailModal";
import { JoinMeCard } from "@/components/JoinMeCard";
import { JoinMeIcon } from "@/components/JoinMeIcon";
import { PolaroidCard } from "@/components/PolaroidCard";
import SummaryPanel from "@/components/SummaryPanel";
import { useAuth } from "@/components/AuthProvider";
import { usePinMutations } from "@/lib/usePinMutations";
import {
  countryFlag,
  filterPins,
  type MapPin,
  type PinFilter,
  type PinSummary,
} from "@/lib/pin";
import {
  filterJoinMePosts,
  pointsBounds,
  type JoinMePost,
} from "@/lib/joinMe";

export type MapLayer = "all" | "pins" | "join-me";

export default function HomeMap({
  pins,
  joinMePosts = [],
  initialLayer = "all",
  summary,
  title,
  locale = "en",
}: {
  pins: MapPin[];
  joinMePosts?: JoinMePost[];
  initialLayer?: MapLayer;
  summary?: PinSummary;
  title?: string;
  locale?: string;
}) {
  const t = useTranslations();
  const { user, loading } = useAuth();
  const { updatePin, deletePin } = usePinMutations();

  const [localPins, setLocalPins] = useState<MapPin[]>(pins);
  const [localJoinMe, setLocalJoinMe] = useState<JoinMePost[]>(joinMePosts);
  const [layer, setLayer] = useState<MapLayer>(initialLayer);
  const [active, setActive] = useState<MapPin | null>(null);
  const [activeJoinMe, setActiveJoinMe] = useState<JoinMePost | null>(null);
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

  const filteredJoinMe = useMemo(
    () => filterJoinMePosts(localJoinMe, activeFilter),
    [localJoinMe, activeFilter],
  );

  const visiblePins = layer === "join-me" ? [] : filteredPins;
  const visibleJoinMe = layer === "pins" ? [] : filteredJoinMe;

  const canEditActive =
    !loading && Boolean(user && active && active.owner_id === user.id);

  async function handleSave(patch: PinEditPatch) {
    if (!active) return;
    await updatePin(active.id, patch, { setPins: setLocalPins, setActive });
  }

  async function handleDelete(id: string) {
    await deletePin(id, { setPins: setLocalPins, setActive });
  }

  function handleJoinMeUpdated(updated: JoinMePost) {
    setLocalJoinMe((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setActiveJoinMe((prev) => (prev && prev.id === updated.id ? updated : prev));
  }

  function handleJoinMeDeleted(id: string) {
    setLocalJoinMe((prev) => prev.filter((p) => p.id !== id));
    setActiveJoinMe((prev) => (prev?.id === id ? null : prev));
  }

  function fitToPoints(points: Array<{ lat: number; lng: number }>) {
    const bounds = pointsBounds(points);
    if (bounds) {
      fitNonceRef.current += 1;
      setFitBoundsState({ bounds, nonce: fitNonceRef.current });
    }
  }

  function handleLayerChange(nextLayer: MapLayer) {
    setLayer(nextLayer);
    if (nextLayer === "join-me" && filteredJoinMe.length > 0) {
      fitToPoints(filteredJoinMe);
    } else if (nextLayer === "pins" && activeFilter && filteredPins.length > 0) {
      fitToPoints(filteredPins);
    }
  }

  function applyFilter(f: PinFilter | null) {
    setActiveFilter(f);
    if (f) {
      const nextPins = layer === "join-me" ? [] : filterPins(localPins, f);
      const nextJoinMe = layer === "pins" ? [] : filterJoinMePosts(localJoinMe, f);
      fitToPoints([...nextPins, ...nextJoinMe]);
      // The summary lives below the map — bring the filtered result into view.
      mapAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setFitBoundsState(null);
    }
  }

  return (
    <>
      {/* Section Header + Map Layer Filter (All / Pins / Join Me) + Clear-filter tag */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
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

        {/* Map Filter Options: All | Pins | Join Me */}
        <div
          role="group"
          aria-label="Map filter"
          className="font-typewriter inline-flex items-center rounded-lg border-2 border-border bg-surface p-0.5 text-xs shadow-xs"
        >
          <button
            type="button"
            onClick={() => handleLayerChange("all")}
            aria-pressed={layer === "all"}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-bold uppercase tracking-wider transition ${
              layer === "all"
                ? "bg-ink text-paper"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <span>{t("Map.filterAll")}</span>
            <span className="opacity-75">
              {filteredPins.length + filteredJoinMe.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleLayerChange("pins")}
            aria-pressed={layer === "pins"}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-bold uppercase tracking-wider transition ${
              layer === "pins"
                ? "bg-magenta text-white"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <span aria-hidden>📌</span>
            <span>{t("Map.filterPins")}</span>
            <span className="opacity-80">{filteredPins.length}</span>
          </button>

          <button
            type="button"
            onClick={() => handleLayerChange("join-me")}
            aria-pressed={layer === "join-me"}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-bold uppercase tracking-wider transition ${
              layer === "join-me"
                ? "bg-verde text-white"
                : "text-verde hover:bg-verde/10"
            }`}
          >
            <JoinMeIcon className="h-3.5 w-3.5" />
            <span>{t("Map.filterJoinMe")}</span>
            <span className="opacity-85">{filteredJoinMe.length}</span>
          </button>
        </div>
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
            pins={visiblePins}
            joinMePosts={visibleJoinMe}
            locale={locale}
            initialZoom={5}
            onPinClick={(pin) => setActive(pin)}
            onJoinMeClick={(post) => setActiveJoinMe(post)}
            fitBounds={fitBoundsState ?? undefined}
            className="h-[52vh] w-full"
          />
        </div>

        {/* Map Legend & Live Counter Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-2.5">
          <div className="font-typewriter flex flex-wrap items-center gap-3 text-xs font-bold text-ink-muted">
            {layer !== "join-me" && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-sun text-[11px] shadow-xs"
                >
                  📌
                </span>
                {activeFilter
                  ? t("Map.filteredOnMap", {
                      shown: filteredPins.length,
                      total: localPins.length,
                    })
                  : t("Map.memoriesOnMap", { count: localPins.length })}
              </span>
            )}

            {layer !== "pins" && (
              <span className="inline-flex items-center gap-1.5 text-verde">
                <span
                  aria-hidden
                  className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-white bg-verde text-white shadow-xs"
                >
                  <JoinMeIcon className="h-3 w-3" />
                </span>
                {t("Map.joinMeOnMap", { count: visibleJoinMe.length })}
              </span>
            )}
          </div>

          <Link
            href="/join-me"
            className="font-typewriter text-[11px] font-bold uppercase tracking-wider text-verde hover:underline"
          >
            {t("JoinMe.openBoard")}
          </Link>
        </div>
      </div>

      {/* Join Me Dispatches Grid (shown prominently in Join Me mode, or as a 3-card preview in All mode) */}
      {(layer === "join-me" || (layer === "all" && filteredJoinMe.length > 0)) && (
        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <span className="font-typewriter inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-verde">
                <JoinMeIcon className="h-3.5 w-3.5" />
                {t("JoinMe.sectionBoardLabel")}
              </span>
              <span className="h-px flex-1 border-t border-dashed border-border" />
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/join-me?compose=1"
                className="font-typewriter rounded-md border border-verde bg-verde/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-verde transition hover:bg-verde hover:text-white"
              >
                {t("JoinMe.newPostCta")}
              </Link>
              <Link
                href="/join-me"
                className="font-typewriter text-xs font-bold text-ink-muted hover:text-ink hover:underline"
              >
                {t("JoinMe.openBoard")}
              </Link>
            </div>
          </div>

          {filteredJoinMe.length === 0 ? (
            <div className="deckle-note rounded-xl p-8 text-center">
              <p className="font-typewriter text-xs text-ink-muted">
                {t("JoinMe.emptyBoard")}
              </p>
              <Link
                href="/join-me?compose=1"
                className="font-typewriter mt-3 inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-verde px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[2px_2px_0px_var(--ink)] transition hover:opacity-95"
              >
                {t("JoinMe.newPostCta")}
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(layer === "join-me" ? filteredJoinMe : filteredJoinMe.slice(0, 3)).map(
                (post) => (
                  <JoinMeCard key={post.id} post={post} locale={locale} />
                ),
              )}
            </div>
          )}
        </section>
      )}

      {/* Masonry taped polaroid grid */}
      {layer !== "join-me" && filteredPins.length > 0 && (
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

      {activeJoinMe && (
        <JoinMeDetailModal
          key={activeJoinMe.id}
          post={activeJoinMe}
          locale={locale}
          onClose={() => setActiveJoinMe(null)}
          onPostUpdated={handleJoinMeUpdated}
          onPostDeleted={handleJoinMeDeleted}
        />
      )}
    </>
  );
}
