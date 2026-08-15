"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  onSave,
  onRelocate,
  relocating,
  onDelete,
}: {
  pin: MapPin;
  onClose: () => void;
  canEdit?: boolean;
  onSave?: (patch: PinEditPatch) => Promise<void>;
  onRelocate?: () => void;
  relocating?: boolean;
  onDelete?: (id: string) => Promise<void>;
}) {
  const t = useTranslations();
  const [notes, setNotes] = useState(pin.notes);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(pin.photo_url);
  const [title, setTitle] = useState(pin.title ?? "");
  const [visitedAt, setVisitedAt] = useState(pin.visited_at ?? "");
  const [tags, setTags] = useState(pin.tags ?? "");
  const [city, setCity] = useState(pin.city);
  const [country, setCountry] = useState(pin.country);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const fullEdit = Boolean(canEdit && onSave);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  async function handleDelete() {
    setDeleting(true);
    await onDelete?.(pin.id);
    setDeleting(false);
    setConfirmDelete(false);
    onClose();
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

  const tagList = (pin.tags ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const inputClass =
    "mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/20";
  const labelClass = "block text-sm font-medium text-ink";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl"
      >
        {editing && fullEdit ? (
          <div className="h-8 bg-surface-2" />
        ) : (
          <div className="relative max-h-[50vh] w-full bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pin.photo_url}
              alt={pin.title ?? "pin"}
              className="max-h-[50vh] w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
              }}
            />
            <button
              onClick={onClose}
              aria-label={t("Modal.close")}
              className="absolute right-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-sm font-medium text-ink shadow hover:bg-surface"
            >
              ✕
            </button>
          </div>
        )}

        <div className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <Link href={`/users/${pin.owner_id}`} className="shrink-0">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-surface-2 ring-2 ring-sun/40">
                {pin.owner_avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
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
                className="font-display block truncate font-semibold text-ink hover:underline"
              >
                {pin.owner_display_name || t("Fallback.pinner")}
              </Link>
              <p className="truncate text-sm text-ink-muted">
                {relocating
                  ? t("Modal.relocatingHint")
                  : [pin.city, pin.country].filter(Boolean).join(", ") || t("Fallback.pinnedLocation")}
              </p>
            </div>
          </div>

          {editing && fullEdit ? (
            <div className="space-y-4">
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

              <div className="rounded-xl bg-sun/10 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sun">{t("Modal.location")}</p>
                  <button
                    type="button"
                    onClick={() => onRelocate?.()}
                    className={`text-sm font-medium underline ${
                      relocating ? "text-danger" : "text-magenta"
                    }`}
                  >
                    {relocating ? t("Modal.cancelRelocate") : t("Modal.relocate")}
                  </button>
                </div>
                {relocating ? (
                  <p className="mt-1 text-ink">{t("Modal.relocateHint")}</p>
                ) : (
                  <div className="mt-1 space-y-2">
                    <p className="text-ink">
                      {city || country ? [city, country].filter(Boolean).join(", ") : t("Add.unknownSpot")}
                    </p>
                    <p className="font-mono text-xs text-ink-muted">
                      {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder={t("Modal.city")}
                        className="flex-1 rounded-lg border border-sun/30 bg-surface px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder={t("Modal.country")}
                        className="flex-1 rounded-lg border border-sun/30 bg-surface px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t("Modal.memo")}
              </h3>
              {canEdit && !editing && (
                <button
                  onClick={startEdit}
                  className="text-sm font-medium text-magenta hover:underline"
                >
                  {t("Modal.edit")}
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder={t("Add.writeMemoPlaceholder")}
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveFull}
                    disabled={saving}
                    className="rounded-xl bg-magenta px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {saving ? t("Modal.saving") : t("Modal.save")}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="rounded-xl px-4 py-2 text-sm text-ink-muted hover:bg-surface-2"
                  >
                    {t("Modal.cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-ink">
                {notes || <span className="italic text-ink-muted">{t("Modal.noMemo")}</span>}
              </p>
            )}
          </div>

          {!editing && (pin.title || pin.visited_at || tagList.length > 0) && (
            <div className="space-y-2 border-t border-border pt-3">
              {pin.title && (
                <p className="text-sm">
                  <span className="font-medium text-ink-muted">{t("Modal.titleLabel")}</span>{" "}
                  <span className="text-ink">{pin.title}</span>
                </p>
              )}
              {pin.visited_at && (
                <p className="text-sm">
                  <span className="font-medium text-ink-muted">{t("Modal.visitedLabel")}</span>{" "}
                  <span className="text-ink">{pin.visited_at}</span>
                </p>
              )}
              {tagList.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {tagList.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-verde/15 px-2.5 py-0.5 text-xs font-medium text-verde"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {canEdit && onDelete && !editing && (
            <div className="border-t border-border pt-3">
              {confirmDelete ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-danger">
                    {t("Modal.deleteConfirm")}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="rounded-xl bg-danger px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {deleting ? t("Modal.deleting") : t("Modal.delete")}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="rounded-xl px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-2"
                    >
                      {t("Modal.keep")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm font-medium text-danger hover:underline"
                >
                  {t("Modal.deletePin")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}