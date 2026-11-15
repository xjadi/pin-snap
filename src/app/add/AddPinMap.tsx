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
import {
  importPhotoFromUrl,
  isManagedPhotoUrl,
  uploadPinPhoto,
  validatePhotoFile,
} from "@/lib/uploadPinPhoto";
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
  const [photoMode, setPhotoMode] = useState<"upload" | "link">("upload");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
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

  // Revoke any pending object URL when the component unmounts.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function handleFileChange(file: File | null) {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }
    const v = validatePhotoFile(file);
    if (!v.ok) {
      setError(v.reason === "size" ? t("Add.photoTooLarge") : t("Add.photoInvalidType"));
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }
    setError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function switchPhotoMode(mode: "upload" | "link") {
    setPhotoMode(mode);
    setError(null);
    if (mode === "upload") {
      // Clear the pasted link when switching back to upload.
      setPhotoUrl("");
    } else {
      // Drop the selected file when switching to link mode.
      handleFileChange(null);
    }
  }

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

    // Resolve the photo source first (upload a file or import a pasted link).
    let finalPhotoUrl = photoUrl.trim();
    if (photoMode === "upload") {
      if (!photoFile) {
        setError(t("Add.choosePhotoFirst"));
        return;
      }
      const v = validatePhotoFile(photoFile);
      if (!v.ok) {
        setError(v.reason === "size" ? t("Add.photoTooLarge") : t("Add.photoInvalidType"));
        return;
      }
      setSaving(true);
      setError(null);
      try {
        finalPhotoUrl = await uploadPinPhoto(photoFile);
      } catch {
        setSaving(false);
        setError(t("Errors.couldNotUploadPhoto"));
        return;
      }
    } else {
      // Link mode: auto-import the linked image into Drive so photo_url is
      // stable (never rots). If the import fails, block the save.
      if (!finalPhotoUrl) return;
      if (!isManagedPhotoUrl(finalPhotoUrl)) {
        setSaving(true);
        setError(null);
        try {
          finalPhotoUrl = await importPhotoFromUrl(finalPhotoUrl);
        } catch {
          setSaving(false);
          setError(t("Errors.linkImportFailed"));
          return;
        }
      }
    }

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
        photo_url: finalPhotoUrl,
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
    handleFileChange(null);
    setPhotoMode("upload");
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
    "mt-1.5 w-full rounded-lg border border-border bg-surface-2/60 px-3.5 py-2 text-sm outline-none focus:border-magenta focus:bg-surface focus:ring-2 focus:ring-magenta/20";
  const labelClass = "font-typewriter block text-xs font-bold uppercase tracking-wider text-ink";

  return (
    <>
      {/* Place-name search */}
      <div ref={searchBoxRef} className="relative mb-5">
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
            className="font-typewriter w-full rounded-lg border-2 border-border bg-surface py-2.5 pl-11 pr-4 text-sm outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/20"
          />
          {searching && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2">
              <span className="h-2 w-2 animate-ping rounded-full bg-magenta" />
            </span>
          )}
        </div>

        {showDropdown && results.length > 0 && (
          <ul className=" absolute z-20 mt-1 w-full overflow-hidden rounded-lg border-2 border-border bg-surface py-1 shadow-lg">
            {results.map((r, i) => (
              <li key={`${r.lat},${r.lng}-${i}`}>
                <button
                  type="button"
                  onClick={() => pickResult(r)}
                  className="flex w-full items-start gap-2 px-4 py-2 text-left text-sm hover:bg-surface-2"
                >
                  <span className="text-ink-muted">📍</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {r.displayName.split(",")[0]}
                    </span>
                    <span className="font-typewriter block truncate text-xs text-ink-muted">
                      {r.displayName}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="polaroid relative">
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
              pins={pins}
              initialZoom={5}
              onMapClick={handleMapClick}
              onPinClick={(pin) => setActive(pin)}
              flyTo={flyTo ?? undefined}
              className="h-[55vh] w-full"
            />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-2 border-border bg-surface shadow-sm">
          <div className="airmail-stripe" />
          <div className="p-5">
            {!draft ? (
              <div className="deckle-note flex min-h-[42vh] flex-col items-center justify-center rounded-sm p-6 text-center text-ink-muted">
                <div className="text-4xl">📍</div>
                <p className="font-typewriter mt-3 max-w-xs text-xs leading-relaxed">
                  {t("Add.emptyDraft")}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="rounded-lg border border-border bg-kraft/45 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="luggage-tag">{t("Add.pinLocation")}</span>
                    <span className="font-typewriter text-xs text-ink-muted">
                      {draft.lat.toFixed(4)}, {draft.lng.toFixed(4)}
                    </span>
                  </div>
                  <p className="mt-2 font-bold text-ink">
                    {reverseLoading ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 animate-ping rounded-full bg-sun" />
                        {t("Add.lookingUp")}
                      </span>
                    ) : (
                      [draft.city, draft.country].filter(Boolean).join(", ") ||
                      t("Add.unknownSpot")
                    )}
                  </p>
                </div>

                {/* Photo — file picker primary, "or paste a link" toggle */}
                {photoMode === "upload" ? (
                  <div>
                    <span className={labelClass}>{t("Add.uploadPhoto")}</span>
                    <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-surface-2 px-4 py-6 text-center transition hover:border-magenta/50">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                      />
                      {photoPreview ? (
                        <div className="polaroid relative w-full max-w-xs">
                          <div
                            aria-hidden
                            className="scotch-tape absolute -top-2.5 left-1/2 z-10 h-5 w-16 -translate-x-1/2 -rotate-2"
                          />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoPreview}
                            alt="preview"
                            className="max-h-48 w-full object-cover"
                          />
                        </div>
                      ) : (
                        <>
                          <span className="text-3xl" aria-hidden>📷</span>
                          <span className="text-sm font-bold">{t("Add.chooseFile")}</span>
                          <span className="font-typewriter text-xs text-ink-muted">
                            JPG · PNG · WebP · GIF — max 5MB
                          </span>
                        </>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={() => switchPhotoMode("link")}
                      className="font-typewriter mt-1.5 text-xs font-bold text-magenta hover:underline"
                    >
                      {t("Add.orPasteLink")}
                    </button>
                  </div>
                ) : (
                  <div>
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
                      <div className="polaroid mt-3 overflow-hidden">
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
                    <button
                      type="button"
                      onClick={() => switchPhotoMode("upload")}
                      className="font-typewriter mt-1.5 text-xs font-bold text-magenta hover:underline"
                    >
                      {t("Add.useUploadInstead")}
                    </button>
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
                  ✎ {t("Add.memo")} <span className="text-ink-muted">{t("Common.optional")}</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder={t("Add.memoPlaceholder")}
                    className={`${inputClass} journal-lined`}
                  />
                </label>

                {error && (
                  <p className="font-typewriter rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="font-typewriter w-full rounded-lg border-2 border-ink bg-magenta px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-[3px_3px_0px_var(--ink)] transition hover:translate-y-[-1px] hover:opacity-95 disabled:opacity-60"
                >
                  {saving
                    ? photoMode === "link" && !isManagedPhotoUrl(photoUrl.trim())
                      ? t("Add.importing")
                      : t("Add.saving")
                    : `📌 ${t("Add.save")}`}
                </button>

                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="font-typewriter w-full rounded-lg border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink-muted hover:bg-surface-2"
                >
                  {t("Add.cancel")}
                </button>
              </form>
            )}
          </div>
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