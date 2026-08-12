"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MapPin } from "@/lib/pin";
import type { PinEditPatch } from "@/components/PinDetailModal";

const SELECT =
  "id, photo_url, lat, lng, city, country, notes, created_at, user_id, title, visited_at, tags";

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
      const { error } = await supabase.from("pins").delete().eq("id", id);
      if (error) return { ok: false };

      opts.setPins((prev) => prev.filter((p) => p.id !== id));
      opts.setActive?.((prev) => (prev?.id === id ? null : prev));
      router.refresh();
      return { ok: true };
    },
    [supabase, router],
  );

  return { updatePin, deletePin };
}