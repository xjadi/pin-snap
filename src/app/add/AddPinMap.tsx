"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MapView from "@/components/MapView";
import PinDetailModal from "@/components/PinDetailModal";
import { createClient } from "@/lib/supabase/client";
import { reverseGeocode } from "@/lib/geocode";
import type { MapPin } from "@/lib/pin";

export default function AddPinMap({ existingPins }: { existingPins: MapPin[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [pins, setPins] = useState<MapPin[]>(existingPins);
  const [draft, setDraft] = useState<{
    lat: number;
    lng: number;
    city: string;
    country: string;
  } | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<MapPin | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));
  }, [supabase]);

  async function handleMapClick(lng: number, lat: number) {
    setDraft({ lat, lng, city: "", country: "" });
    setReverseLoading(true);
    setError(null);
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
      })
      .select("id, photo_url, lat, lng, city, country, notes, created_at, user_id")
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
    };

    setPins((prev) => [newPin, ...prev]);
    setDraft(null);
    setPhotoUrl("");
    setNotes("");
    router.refresh();
  }

  async function updateNotes(id: string, newNotes: string) {
    const { error: upErr } = await supabase
      .from("pins")
      .update({ notes: newNotes })
      .eq("id", id);
    if (upErr) return;
    setPins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, notes: newNotes } : p)),
    );
    setActive((prev) =>
      prev && prev.id === id ? { ...prev, notes: newNotes } : prev,
    );
  }

  async function deletePin(id: string) {
    const { error: delErr } = await supabase.from("pins").delete().eq("id", id);
    if (delErr) return;
    setPins((prev) => prev.filter((p) => p.id !== id));
    setActive(null);
    router.refresh();
  }

  const isActiveMine = active && myUserId && active.owner_id === myUserId;

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="overflow-hidden rounded-3xl border border-stone-200 shadow-sm dark:border-stone-800">
          <MapView
            pins={pins}
            initialZoom={5}
            onMapClick={handleMapClick}
            onPinClick={(pin) => setActive(pin)}
            className="h-[60vh] w-full"
          />
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          {!draft ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-stone-500 dark:text-stone-400">
              <div className="text-4xl">📍</div>
              <p className="mt-3 max-w-xs">
                Click anywhere on the map to drop a pin there. We&apos;ll guess the
                city and country for you.
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
                    [draft.city, draft.country].filter(Boolean).join(", ") ||
                    "Unknown spot"
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
          onClose={() => setActive(null)}
          canEdit={Boolean(isActiveMine)}
          onSaveNotes={async (n) => updateNotes(active.id, n)}
        />
      )}

      {isActiveMine && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[110] flex justify-center px-4">
          <button
            onClick={() => deletePin(active!.id)}
            className="pointer-events-auto rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 shadow ring-1 ring-rose-200 hover:bg-rose-100"
          >
            Delete this pin
          </button>
        </div>
      )}
    </>
  );
}