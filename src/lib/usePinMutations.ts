"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  driveFileIdFromUrl,
  storagePathFromUrl,
} from "@/lib/uploadPinPhoto";
import type { MapPin } from "@/lib/pin";
import type { PinEditPatch } from "@/components/PinDetailModal";

const SELECT =
  "id, photo_url, lat, lng, city, country, notes, created_at, user_id, title, visited_at, tags";

/** Best-effort removal of a stored photo (Supabase Storage or legacy Drive). */
function cleanupStoredPhoto(url: string | null | undefined) {
  if (!url) return;
  const storagePath = storagePathFromUrl(url);
  if (storagePath) {
    fetch("/api/storage", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: storagePath }),
    }).catch(() => {});
    return;
  }
  const fileId = driveFileIdFromUrl(url);
  if (fileId) {
    fetch(`/api/photo/${fileId}`, { method: "DELETE" }).catch(() => {});
  }
}

/**
 * Shared client-side pin mutation + local-state sync helpers.
 * Used by HomeMap, UserMap and AddPinMap to keep behavior consistent.
 * RLS on the `pins` table enforces auth.uid() = user_id for update/delete.
 */
export function usePinMutations() {
  const router = useRouter();
  const supabase = createClient();

  const updatePin = useCallback(
    async (
      id: string,
      patch: PinEditPatch,
      opts: {
        setPins: React.Dispatch<React.SetStateAction<MapPin[]>>;
        setActive?: React.Dispatch<React.SetStateAction<MapPin | null>>;
      },
    ): Promise<{ ok: boolean }> => {
      // Grab the existing photo URL so we can clean up a replaced Drive file.
      const { data: existing } = await supabase
        .from("pins")
        .select("photo_url")
        .eq("id", id)
        .single();

      const { data, error } = await supabase
        .from("pins")
        .update({
          photo_url: patch.photo_url,
          lat: patch.lat,
          lng: patch.lng,
          city: patch.city,
          country: patch.country,
          notes: patch.notes,
          title: patch.title,
          visited_at: patch.visited_at,
          tags: patch.tags,
        })
        .eq("id", id)
        .select(SELECT)
        .single();

      if (error || !data) {
        return { ok: false };
      }

      opts.setPins((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                photo_url: data.photo_url,
                lat: data.lat,
                lng: data.lng,
                city: data.city,
                country: data.country,
                notes: data.notes,
                title: data.title,
                visited_at: data.visited_at,
                tags: data.tags,
              }
            : p,
        ),
      );
      opts.setActive?.((prev) =>
        prev && prev.id === id
          ? {
              ...prev,
              photo_url: data.photo_url,
              lat: data.lat,
              lng: data.lng,
              city: data.city,
              country: data.country,
              notes: data.notes,
              title: data.title,
              visited_at: data.visited_at,
              tags: data.tags,
            }
          : prev,
      );

      router.refresh();

      // If the photo was swapped, remove the old stored file (best-effort).
      const oldUrl = (existing as { photo_url?: string } | null)?.photo_url;
      if (oldUrl && oldUrl !== data.photo_url) {
        cleanupStoredPhoto(oldUrl);
      }

      return { ok: true };
    },
    [supabase, router],
  );

  const deletePin = useCallback(
    async (
      id: string,
      opts: {
        setPins: React.Dispatch<React.SetStateAction<MapPin[]>>;
        setActive?: React.Dispatch<React.SetStateAction<MapPin | null>>;
      },
    ): Promise<{ ok: boolean }> => {
      // Grab the photo URL before the row disappears (for file cleanup).
      const { data: existing } = await supabase
        .from("pins")
        .select("photo_url")
        .eq("id", id)
        .single();

      const { error } = await supabase.from("pins").delete().eq("id", id);
      if (error) return { ok: false };

      // Best-effort: remove the stored file so it doesn't orphan.
      cleanupStoredPhoto((existing as { photo_url?: string } | null)?.photo_url);

      opts.setPins((prev) => prev.filter((p) => p.id !== id));
      opts.setActive?.((prev) => (prev?.id === id ? null : prev));
      router.refresh();
      return { ok: true };
    },
    [supabase, router],
  );

  return { updatePin, deletePin };
}