"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import MapView from "@/components/MapView";
import PinDetailModal, { type PinEditPatch } from "@/components/PinDetailModal";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { usePinMutations } from "@/lib/usePinMutations";
import { reverseGeocode, searchPlace, type GeocodeResult } from "@/lib/geocode";
import type { MapPin } from "@/lib/pin";

export default function AddPinMap({ existingPins }: { existingPins: MapPin[] }) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const { updatePin: updatePinMut, deletePin: deletePinMut } = usePinMutations();

  const [pins, setPins] = useState<MapPin[]>(existingPins);
  const [draft, setDraft] = useState<{
    lat: number;
    lng: number;
    city: string;
    country: string;
  } | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [visitedAt, setVisitedAt] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<MapPin | null>(null);
  const [relocating, setRelocating] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  const [flyTo, setFlyTo] = useState<{
    center: [number, number];
    zoom?: number;
    nonce: number;
  } | null>(null);
  const flyNonceRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    let cancelled = false;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (q.length < 3) {
      t = setTimeout(() => {
        if (cancelled) return;
        setResults([]);
        setShowDropdown(false);
      }, 0);
    } else {
      t = setTimeout(async () => {
        if (cancelled) return;
        setSearching(true);
        const r = await searchPlace(q);
        if (cancelled) return;
        setResults(r);
        setShowDropdown(true);
        setSearching(false);
      }, 400);
    }
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pickResult(r: GeocodeResult) {
    setShowDropdown(false);
    setQuery(r.displayName.split(",")[0]);
    setDraft({ lat: r.lat, lng: r.lng, city: r.city, country: r.country });
    flyNonceRef.current += 1;
    setFlyTo({ center: [r.lng, r.lat], zoom: 14, nonce: flyNonceRef.current });
  }

  async function handleMapClick(lng: number, lat: number) {
    setError(null);
    if (relocating && active) {
      setReverseLoading(true);
      const place = await reverseGeocode(lat, lng);
      setReverseLoading(false);
      setRelocating(false);
      setActive({
        ...active,
        lat,
        lng,
        city: place.city,
        country: place.country,
      });
      flyNonceRef.current += 1;
      setFlyTo({ center: [lng, lat], zoom: 14, nonce: flyNonceRef.current });
      return;
    }
    setDraft({ lat, lng, city: "", country: "" });
    setReverseLoading(true);
    const place = await reverseGeocode(lat, lng);
    setDraft({ lat, lng, city: place.city, country: place.country });
    setReverseLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(t("Auth.signInFirst"));
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("pins")
      .insert({
        user_id: user.id,
        photo_url: photoUrl.trim(),
        lat: draft.lat,
        lng: draft.lng,
        city: draft.city,
        country: draft.country,
        notes: notes.trim(),
        title: title.trim() || null,
        visited_at: visitedAt || null,
        tags: tags.trim() || null,
      })
      .select(
        "id, photo_url, lat, lng, city, country, notes, created_at, user_id, title, visited_at, tags",
      )
      .single();

    setSaving(false);

    if (insertError || !data) {
      setError(insertError?.message ?? t("Errors.couldNotSavePin"));
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single();

    const newPin: MapPin = {
      ...data,
      owner_id: data.user_id,
      owner_display_name: profile?.display_name ?? t("Fallback.pinner"),
      owner_avatar_url: profile?.avatar_url ?? "",
      title: data.title,
      visited_at: data.visited_at,
      tags: data.tags,
    };

    setPins((prev) => [newPin, ...prev]);
    setDraft(null);
    setPhotoUrl("");
    setTitle("");
    setVisitedAt("");
    setTags("");
    setNotes("");
    router.refresh();
  }

  async function updatePin(id: string, patch: PinEditPatch) {
    const { ok } = await updatePinMut(id, patch, { setPins, setActive });
    if (!ok) setError(t("Errors.couldNotUpdatePin"));
    setRelocating(false);
  }

  async function deletePin(id: string) {
    const { ok } = await deletePinMut(id, { setPins, setActive });
    if (!ok) setError(t("Errors.couldNotDeletePin"));
    setRelocating(false);
  }

  const isActiveMine =
    !authLoading && Boolean(user && active && active.owner_id === user.id);

  const inputClass =
    "mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/20";
  const labelClass = "block text-sm font-medium text-ink";

  return (
    <>
      {/* Place-name search */}
      <div ref={searchBoxRef} className="relative mb-4">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted">
            🔎
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setShowDropdown(true)}
            placeholder={t("Add.searchPlaceholder")}
            className="w-full rounded-full border border-border bg-surface py-2.5 pl-11 pr-4 text-sm outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/20"
          />
          {searching && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2">
              <span className="h-2 w-2 animate-ping rounded-full bg-magenta" />
            </span>
          )}
        </div>

        {showDropdown && results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-lg">
            {results.map((r, i) => (
              <li key={`${r.lat},${r.lng}-${i}`}>
                <button
                  type="button"
                  onClick={() => pickResult(r)}
                  className="flex w-full items-start gap-2 px-4 py-2 text-left text-sm hover:bg-surface-2"
                >
                  <span className="text-ink-muted">📍</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {r.displayName.split(",")[0]}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">
                      {r.displayName}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="polaroid">
          <MapView
            pins={pins}
            initialZoom={5}
            onMapClick={handleMapClick}
            onPinClick={(pin) => setActive(pin)}
            flyTo={flyTo ?? undefined}
            className="h-[55vh] w-full"
          />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          {!draft ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-ink-muted">
              <div className="text-4xl">📍</div>
              <p className="mt-3 max-w-xs">{t("Add.emptyDraft")}</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="rounded-xl bg-sun/10 p-3 text-sm">
                <p className="font-semibold text-sun">{t("Add.pinLocation")}</p>
                <p className="text-ink">
                  {reverseLoading ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 animate-ping rounded-full bg-sun" />
                      {t("Add.lookingUp")}
                    </span>
                  ) : (
                    [draft.city, draft.country].filter(Boolean).join(", ") || t("Add.unknownSpot")
                  )}
                </p>
                <p className="mt-1 font-mono text-xs text-ink-muted">
                  {draft.lat.toFixed(4)}, {draft.lng.toFixed(4)}
                </p>
              </div>

              <label className={labelClass}>
                {t("Add.photoLink")}
                <input
                  type="url"
                  required
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder={t("Add.photoPlaceholder")}
                  className={inputClass}
                />
              </label>

              {photoUrl && (
                <div className="overflow-hidden rounded-xl border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt="preview"
                    className="max-h-48 w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
                    }}
                  />
                </div>
              )}

              <label className={labelClass}>
                {t("Add.title")} <span className="text-ink-muted">{t("Common.optional")}</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("Add.titlePlaceholder")}
                  className={inputClass}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  {t("Add.dateVisited")} <span className="text-ink-muted">{t("Common.optional")}</span>
                  <input
                    type="date"
                    value={visitedAt}
                    onChange={(e) => setVisitedAt(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  {t("Add.tags")} <span className="text-ink-muted">{t("Add.commaSeparated")}</span>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder={t("Add.tagsPlaceholder")}
                    className={inputClass}
                  />
                </label>
              </div>

              <label className={labelClass}>
                {t("Add.memo")} <span className="text-ink-muted">{t("Common.optional")}</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={t("Add.memoPlaceholder")}
                  className={inputClass}
                />
              </label>

              {error && (
                <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-magenta px-4 py-2.5 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
              >
                {saving ? t("Add.saving") : t("Add.save")}
              </button>

              <button
                type="button"
                onClick={() => setDraft(null)}
                className="w-full rounded-xl px-4 py-2 text-sm text-ink-muted hover:bg-surface-2"
              >
                {t("Add.cancel")}
              </button>
            </form>
          )}
        </div>
      </div>

      {active && (
        <PinDetailModal
          key={active.id}
          pin={active}
          onClose={() => {
            setActive(null);
            setRelocating(false);
          }}
          canEdit={Boolean(isActiveMine)}
          onSave={isActiveMine ? (patch) => updatePin(active.id, patch) : undefined}
          onDelete={isActiveMine ? (id) => deletePin(id) : undefined}
          onRelocate={isActiveMine ? () => setRelocating((v) => !v) : undefined}
          relocating={relocating}
        />
      )}
    </>
  );
}