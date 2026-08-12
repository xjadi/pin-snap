"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { MapPin } from "@/lib/pin";

export interface PinEditPatch {
  photo_url: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  notes: string;
  title: string | null;
  visited_at: string | null;
  tags: string | null;
}

export default function PinDetailModal({
  pin,
  onClose,
  canEdit,
  onSaveNotes,
  onSave,
  onRelocate,
  relocating,
}: {
  pin: MapPin;
  onClose: () => void;
  canEdit?: boolean;
  /** Legacy notes-only save (kept for callers that didn't migrate yet). */
  onSaveNotes?: (notes: string) => Promise<void>;
  /** Full-row save. If provided, the Edit button switches to full-edit mode. */
  onSave?: (patch: PinEditPatch) => Promise<void>;
  /** Ask the parent to enter "relocate" mode (next map click updates this pin). */
  onRelocate?: () => void;
  /** True while the parent is waiting for the next map click to relocate this pin. */
  relocating?: boolean;
}) {
  const [notes, setNotes] = useState(pin.notes);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Full-edit form state (only used when onSave provided)
  const [photoUrl, setPhotoUrl] = useState(pin.photo_url);
  const [title, setTitle] = useState(pin.title ?? "");
  const [visitedAt, setVisitedAt] = useState(pin.visited_at ?? "");
  const [tags, setTags] = useState(pin.tags ?? "");
  const [city, setCity] = useState(pin.city);
  const [country, setCountry] = useState(pin.country);

  const fullEdit = Boolean(canEdit && onSave);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function saveNotesOnly() {
    setSaving(true);
    await onSaveNotes?.(notes);
    setSaving(false);
    setEditing(false);
  }

  async function saveFull() {
    setSaving(true);
    await onSave?.({
      photo_url: photoUrl.trim(),
      lat: pin.lat,
      lng: pin.lng,
      city: city.trim(),
      country: country.trim(),
      notes: notes.trim(),
      title: title.trim() || null,
      visited_at: visitedAt || null,
      tags: tags.trim() || null,
    });
    setSaving(false);
    setEditing(false);
  }

  function startEdit() {
    setPhotoUrl(pin.photo_url);
    setTitle(pin.title ?? "");
    setVisitedAt(pin.visited_at ?? "");
    setTags(pin.tags ?? "");
    setCity(pin.city);
    setCountry(pin.country);
    setNotes(pin.notes);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setNotes(pin.notes);
  }

  const tagList = (pin.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-stone-900 sm:rounded-3xl"
      >
        {editing && fullEdit ? (
          <div className="relative max-h-[50vh] w-full bg-stone-200 dark:bg-stone-800" />
        ) : (
          <div className="relative max-h-[50vh] w-full bg-stone-100 dark:bg-stone-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pin.photo_url}
              alt="pin"
              className="max-h-[50vh] w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
              }}
            />
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-stone-700 shadow hover:bg-white dark:bg-stone-800/90 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              ✕
            </button>
          </div>
        )}

        <div className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <Link href={`/users/${pin.owner_id}`} className="shrink-0">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-stone-100 ring-2 ring-amber-200 dark:bg-stone-800">
                {pin.owner_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pin.owner_avatar_url}
                    alt={pin.owner_display_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "🙂"
                )}
              </span>
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/users/${pin.owner_id}`}
                className="block truncate font-semibold text-stone-800 hover:underline dark:text-stone-100"
              >
                {pin.owner_display_name || "Pinner"}
              </Link>
              <p className="truncate text-sm text-stone-500 dark:text-stone-400">
                {relocating
                  ? "Click the map to set a new location…"
                  : [pin.city, pin.country].filter(Boolean).join(", ") || "Pinned location"}
              </p>
            </div>
          </div>

          {editing && fullEdit ? (
            <div className="space-y-4">
              {/* Photo URL */}
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

              {/* Title */}
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

              {/* Date visited + Tags */}
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

              {/* Location */}
              <div className="rounded-2xl bg-amber-50 p-3 text-sm dark:bg-amber-950/40">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-amber-700 dark:text-amber-300">Location</p>
                  <button
                    type="button"
                    onClick={() => onRelocate?.()}
                    className={`text-sm font-medium underline ${
                      relocating
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {relocating ? "Cancel relocate" : "Relocate on map"}
                  </button>
                </div>
                {relocating ? (
                  <p className="mt-1 text-amber-800 dark:text-amber-200">
                    Click the map to drop this pin somewhere else…
                  </p>
                ) : (
                  <div className="mt-1 space-y-2">
                    <p className="text-amber-800 dark:text-amber-200">
                      {city || country ? [city, country].filter(Boolean).join(", ") : "Unknown spot"}
                    </p>
                    <p className="font-mono text-xs text-amber-700/80 dark:text-amber-300/80">
                      {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className="flex-1 rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs dark:border-amber-800 dark:bg-stone-800 dark:text-stone-100"
                      />
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="Country"
                        className="flex-1 rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs dark:border-amber-800 dark:bg-stone-800 dark:text-stone-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Memo block — read view OR memo-only-edit OR part of full-edit */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                Memo
              </h3>
              {canEdit && !editing && (
                <button
                  onClick={startEdit}
                  className="text-sm font-medium text-amber-600 hover:underline dark:text-amber-400"
                >
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Write a memory about this spot…"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={fullEdit ? saveFull : saveNotesOnly}
                    disabled={saving}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="rounded-xl px-4 py-2 text-sm text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-stone-700 dark:bg-stone-800 dark:text-stone-200">
                {notes || <span className="italic text-stone-400">No memo yet.</span>}
              </p>
            )}
          </div>

          {!editing && (pin.title || pin.visited_at || tagList.length > 0) && (
            <div className="space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
              {pin.title && (
                <p className="text-sm">
                  <span className="font-medium text-stone-500 dark:text-stone-400">Title:</span>{" "}
                  <span className="text-stone-800 dark:text-stone-100">{pin.title}</span>
                </p>
              )}
              {pin.visited_at && (
                <p className="text-sm">
                  <span className="font-medium text-stone-500 dark:text-stone-400">Visited:</span>{" "}
                  <span className="text-stone-800 dark:text-stone-100">{pin.visited_at}</span>
                </p>
              )}
              {tagList.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {tagList.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}