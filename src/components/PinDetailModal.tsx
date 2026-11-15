"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  importPhotoFromUrl,
  isManagedPhotoUrl,
  uploadPinPhoto,
  validatePhotoFile,
} from "@/lib/uploadPinPhoto";
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
  const [photoMode, setPhotoMode] = useState<"upload" | "link">("link");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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
    setFormError(null);

    // Resolve the photo source: a newly-uploaded file, or the pasted URL
    // (which defaults to the pin's existing URL).
    let finalPhotoUrl = photoUrl.trim();
    if (photoMode === "upload" && photoFile) {
      const v = validatePhotoFile(photoFile);
      if (!v.ok) {
        setSaving(false);
        setFormError(
          v.reason === "size" ? t("Add.photoTooLarge") : t("Add.photoInvalidType"),
        );
        return;
      }
      try {
        finalPhotoUrl = await uploadPinPhoto(photoFile);
      } catch {
        setSaving(false);
        setFormError(t("Errors.couldNotUploadPhoto"));
        return;
      }
    } else if (photoMode === "link" && finalPhotoUrl) {
      // Auto-import an external link into Drive so the stored URL is stable.
      // (Skip if it's already our own /api/photo URL or the unchanged
      // existing URL.)
      const unchanged = finalPhotoUrl === pin.photo_url;
      if (!unchanged && !isManagedPhotoUrl(finalPhotoUrl)) {
        try {
          finalPhotoUrl = await importPhotoFromUrl(finalPhotoUrl);
        } catch {
          setSaving(false);
          setFormError(t("Errors.linkImportFailed"));
          return;
        }
      }
    }

    await onSave?.({
      photo_url: finalPhotoUrl,
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

  function handleFileChange(file: File | null) {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }
    const v = validatePhotoFile(file);
    if (!v.ok) {
      setFormError(
        v.reason === "size" ? t("Add.photoTooLarge") : t("Add.photoInvalidType"),
      );
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }
    setFormError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
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
    setPhotoMode("link");
    handleFileChange(null);
    setFormError(null);
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
    setPhotoMode("link");
    handleFileChange(null);
    setFormError(null);
  }

  // Revoke any pending object URL when the modal unmounts.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const tagList = (pin.tags ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const inputClass =
    "mt-1 w-full rounded-lg border border-border bg-surface px-3.5 py-2 text-sm outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/20";
  const labelClass = "font-typewriter block text-xs font-bold uppercase tracking-wider text-ink";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-xl border-2 border-border bg-surface shadow-2xl sm:rounded-xl"
      >
        <div className="airmail-stripe sticky top-0 z-20" />

        {editing && fullEdit ? (
          <div className="flex items-center justify-between border-b border-dashed border-border bg-surface-2 px-5 py-3">
            <span className="font-typewriter text-xs font-bold uppercase tracking-widest text-magenta">
              ✎ EDIT JOURNAL ENTRY
            </span>
            <button
              onClick={onClose}
              aria-label={t("Modal.close")}
              className="font-typewriter rounded border border-border bg-surface px-2.5 py-0.5 text-xs font-bold text-ink hover:bg-surface-2"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="relative bg-surface-2 p-3 pt-5 sm:p-4 sm:pt-6">
            {/* Translucent Scotch tape at top center of the photo */}
            <div
              aria-hidden
              className="scotch-tape absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 -rotate-1"
            />
            <div className="polaroid overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pin.photo_url}
                alt={pin.title ?? "pin"}
                className="max-h-[44vh] w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
                }}
              />
            </div>
            <button
              onClick={onClose}
              aria-label={t("Modal.close")}
              className="font-typewriter absolute right-5 top-5 z-20 rounded border border-border bg-surface/95 px-2.5 py-1 text-xs font-bold text-ink shadow hover:bg-surface"
            >
              ✕
            </button>
          </div>
        )}

        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-border pb-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link href={`/users/${pin.owner_id}`} className="shrink-0">
                <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 ring-2 ring-sun/40">
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
                  className="font-display block truncate font-bold text-ink hover:underline"
                >
                  {pin.owner_display_name || t("Fallback.pinner")}
                </Link>
                <p className="font-typewriter truncate text-xs text-ink-muted">
                  📍{" "}
                  {relocating
                    ? t("Modal.relocatingHint")
                    : [pin.city, pin.country].filter(Boolean).join(", ") ||
                      t("Fallback.pinnedLocation")}
                </p>
              </div>
            </div>

            {pin.visited_at && !editing && (
              <span className="rubber-stamp shrink-0 -rotate-2 text-[10px] text-magenta">
                {pin.visited_at}
              </span>
            )}
          </div>

          {editing && fullEdit ? (
            <div className="space-y-4">
              {/* Photo — link mode (prefilled) or upload a replacement */}
              {photoMode === "link" ? (
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
                    <div className="mt-2 overflow-hidden rounded-lg border border-border">
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
                    onClick={() => setPhotoMode("upload")}
                    className="font-typewriter mt-1 text-xs font-bold text-magenta hover:underline"
                  >
                    {t("Add.useUploadInstead")}
                  </button>
                </div>
              ) : (
                <div>
                  <span className={labelClass}>{t("Add.uploadPhoto")}</span>
                  <label className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-surface-2 px-4 py-6 text-center transition hover:border-magenta/50">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                    />
                    {photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoPreview}
                        alt="preview"
                        className="max-h-48 w-full rounded object-cover"
                      />
                    ) : (
                      <>
                        <span className="text-3xl" aria-hidden>📷</span>
                        <span className="text-sm font-medium">{t("Add.chooseFile")}</span>
                        <span className="font-typewriter text-xs text-ink-muted">
                          JPG · PNG · WebP · GIF — max 5MB
                        </span>
                      </>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMode("link");
                      handleFileChange(null);
                    }}
                    className="font-typewriter mt-1 text-xs font-bold text-magenta hover:underline"
                  >
                    {t("Add.orPasteLink")}
                  </button>
                </div>
              )}
              {formError && (
                <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
                  {formError}
                </p>
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

              <div className="rounded-lg border border-border bg-kraft/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-typewriter text-xs font-bold uppercase tracking-wider text-ink">
                    📍 {t("Modal.location")}
                  </p>
                  <button
                    type="button"
                    onClick={() => onRelocate?.()}
                    className={`font-typewriter text-xs font-bold underline ${
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
                    <p className="font-bold text-ink">
                      {city || country ? [city, country].filter(Boolean).join(", ") : t("Add.unknownSpot")}
                    </p>
                    <p className="font-typewriter text-xs text-ink-muted">
                      {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder={t("Modal.city")}
                        className="flex-1 rounded border border-border bg-surface px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder={t("Modal.country")}
                        className="flex-1 rounded border border-border bg-surface px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {!editing && pin.title && (
            <h2 className="font-display text-lg font-bold text-ink">
              {pin.title}
            </h2>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="font-typewriter text-xs font-bold uppercase tracking-wider text-ink-muted">
                ✎ {t("Modal.memo")}
              </h3>
              {canEdit && !editing && (
                <button
                  onClick={startEdit}
                  className="font-typewriter text-xs font-bold uppercase tracking-wider text-magenta hover:underline"
                >
                  {t("Modal.edit")}
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder={t("Add.writeMemoPlaceholder")}
                  className={`${inputClass} journal-lined`}
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveFull}
                    disabled={saving}
                    className="font-typewriter rounded-md border-2 border-ink bg-magenta px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[2px_2px_0px_var(--ink)] hover:opacity-90 disabled:opacity-60"
                  >
                    {saving ? t("Modal.saving") : t("Modal.save")}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="font-typewriter rounded-md border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink-muted hover:bg-surface-2"
                  >
                    {t("Modal.cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <p className="journal-lined whitespace-pre-wrap rounded-md border border-border px-3.5 py-2 text-sm text-ink">
                {notes || <span className="italic text-ink-muted">{t("Modal.noMemo")}</span>}
              </p>
            )}
          </div>

          {!editing && tagList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-3">
              {tagList.map((tag) => (
                <span key={tag} className="luggage-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {canEdit && onDelete && !editing && (
            <div className="border-t border-dashed border-border pt-3">
              {confirmDelete ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="font-typewriter text-xs font-bold text-danger">
                    {t("Modal.deleteConfirm")}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="font-typewriter rounded border border-danger bg-danger px-3 py-1 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {deleting ? t("Modal.deleting") : t("Modal.delete")}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="font-typewriter rounded border border-border px-3 py-1 text-xs font-bold text-ink-muted hover:bg-surface-2"
                    >
                      {t("Modal.keep")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="font-typewriter text-xs font-bold uppercase tracking-wider text-danger hover:underline"
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