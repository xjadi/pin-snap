"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { MapPin } from "@/lib/pin";

export default function PinDetailModal({
  pin,
  onClose,
  canEdit,
  onSaveNotes,
}: {
  pin: MapPin;
  onClose: () => void;
  canEdit?: boolean;
  onSaveNotes?: (notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(pin.notes);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    setSaving(true);
    await onSaveNotes?.(notes);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="relative max-h-[50vh] w-full bg-stone-100">
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
            className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-stone-700 shadow hover:bg-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <Link href={`/users/${pin.owner_id}`} className="shrink-0">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-stone-100 ring-2 ring-amber-200">
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
            <div className="min-w-0">
              <Link
                href={`/users/${pin.owner_id}`}
                className="block truncate font-semibold text-stone-800 hover:underline"
              >
                {pin.owner_display_name || "Pinner"}
              </Link>
              <p className="truncate text-sm text-stone-500">
                {([pin.city, pin.country].filter(Boolean).join(", ") ||
                  "Pinned location")}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
                Memo
              </h3>
              {canEdit && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm font-medium text-amber-600 hover:underline"
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
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
                <div className="flex gap-2">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save memo"}
                  </button>
                  <button
                    onClick={() => {
                      setNotes(pin.notes);
                      setEditing(false);
                    }}
                    className="rounded-xl px-4 py-2 text-sm text-stone-500 hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-stone-700">
                {notes || (
                  <span className="italic text-stone-400">No memo yet.</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}