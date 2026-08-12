"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MapView from "@/components/MapView";
import PinDetailModal, { type PinEditPatch } from "@/components/PinDetailModal";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { usePinMutations } from "@/lib/usePinMutations";
import { reverseGeocode, searchPlace, type GeocodeResult } from "@/lib/geocode";
import type { MapPin } from "@/lib/pin";

export default function AddPinMap({ existingPins }: { existingPins: MapPin[] }) {
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

  // Relocate mode (full edit)
  const [relocating, setRelocating] = useState(false);

  // Place-name search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  // Map fly-to
  const [flyTo, setFlyTo] = useState<{
    center: [number, number];
    zoom?: number;
    nonce: number;
  } | null>(null);
  const flyNonceRef = useRef(0);

  // Debounced search-as-you-type (min 3 chars, 400ms).
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

  // Click outside the search box closes the dropdown.
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
    draftFromResult(r);
    flyNonceRef.current += 1;
    setFlyTo({ center: [r.lng, r.lat], zoom: 14, nonce: flyNonceRef.current });
  }

  function draftFromResult(r: GeocodeResult) {
    setDraft({ lat: r.lat, lng: r.lng, city: r.city, country: r.country });
  }

  async function handleMapClick(lng: number, lat: number) {
    setError(null);
    // Relocate the currently-open pin instead of creating a new draft.
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
      setError("Sign in first to add a pin.");
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
      setError(insertError?.message ?? "Could not save pin.");
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
      owner_display_name: profile?.display_name ?? "Pinner",
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
    if (!ok) setError("Could not update pin.");
    setRelocating(false);
  }

  async function deletePin(id: string) {
    const { ok } = await deletePinMut(id, { setPins, setActive });
    if (!ok) setError("Could not delete pin.");
    setRelocating(false);
  }

  const isActiveMine =
    !authLoading && Boolean(user && active && active.owner_id === user.id);

  return (
    <>
      {/* Place-name search (full width above the map) */}
      <div ref={searchBoxRef} className="relative mb-4">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
            🔎
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setShowDropdown(true)}
            placeholder="Search a place — city, landmark, address…"
            className="w-full rounded-full border border-stone-300 bg-white py-2.5 pl-11 pr-4 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500"
          />
          {searching && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400">
              <span className="h-2 w-2 animate-ping rounded-full bg-amber-500" />
            </span>
          )}
        </div>

        {showDropdown && results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
            {results.map((r, i) => (
              <li key={`${r.lat},${r.lng}-${i}`}>
                <button
                  type="button"
                  onClick={() => pickResult(r)}
                  className="flex w-full items-start gap-2 px-4 py-2 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  <span className="text-stone-400">📍</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-stone-800 dark:text-stone-100">
                      {r.displayName.split(",")[0]}
                    </span>
                    <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
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
        <div className="overflow-hidden rounded-3xl border border-stone-200 shadow-sm dark:border-stone-800">
          <MapView
            pins={pins}
            initialZoom={5}
            onMapClick={handleMapClick}
            onPinClick={(pin) => setActive(pin)}
            flyTo={flyTo ?? undefined}
            className="h-[60vh] w-full"
          />
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          {!draft ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-stone-500 dark:text-stone-400">
              <div className="text-4xl">📍</div>
              <p className="mt-3 max-w-xs">
                Search a place above, or click anywhere on the map to drop a pin.
                We&apos;ll guess the city and country for you.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="rounded-2xl bg-amber-50 p-3 text-sm dark:bg-amber-950/40">
                <p className="font-medium text-amber-700 dark:text-amber-300">Pin location</p>
                <p className="text-amber-800 dark:text-amber-200">
                  {reverseLoading ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 animate-ping rounded-full bg-amber-500" />
                      Looking up the place…
                    </span>
                  ) : (
                    [draft.city, draft.country].filter(Boolean).join(", ") || "Unknown spot"
                  )}
                </p>
                <p className="mt-1 font-mono text-xs text-amber-700/80 dark:text-amber-300/80">
                  {draft.lat.toFixed(4)}, {draft.lng.toFixed(4)}
                </p>
              </div>

              <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                Photo link
                <input
                  type="url"
                  required
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://…/photo.jpg"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
                />
              </label>

              {photoUrl && (
                <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700">
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

              <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                Title <span className="text-stone-400 dark:text-stone-500">(optional)</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sunset at Wat Arun"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                  Date visited <span className="text-stone-400 dark:text-stone-500">(optional)</span>
                  <input
                    type="date"
                    value={visitedAt}
                    onChange={(e) => setVisitedAt(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  />
                </label>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                  Tags <span className="text-stone-400 dark:text-stone-500">(comma-separated)</span>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="food, temple, hike"
                    className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                Memo <span className="text-stone-400 dark:text-stone-500">(optional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="What happened at this spot?"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
                />
              </label>

              {error && (
                <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-amber-500 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save pin"}
              </button>

              <button
                type="button"
                onClick={() => setDraft(null)}
                className="w-full rounded-xl px-4 py-2 text-sm text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                Cancel
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