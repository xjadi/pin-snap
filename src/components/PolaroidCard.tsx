"use client";

import { useTranslations } from "next-intl";
import type { MapPin } from "@/lib/pin";

export function PolaroidCard({
  pin,
  index,
  onClick,
  showOwner,
}: {
  pin: MapPin;
  index: number;
  onClick?: () => void;
  showOwner?: boolean;
}) {
  const t = useTranslations();
  const location =
    [pin.city, pin.country].filter(Boolean).join(", ") || t("Fallback.pinned");
  const rotation = index % 2 === 0 ? "-1deg" : "1deg";

  return (
    <button
      onClick={onClick}
      className="polaroid mb-4 block w-full break-inside-avoid text-left"
      style={{ transform: `rotate(${rotation})` }}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pin.photo_url}
          alt={pin.title ?? location}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
          }}
        />
      </div>
      <div className="px-2 py-1.5 pb-2.5">
        {showOwner && (
          <p className="font-display truncate text-sm font-semibold">
            {pin.owner_display_name || t("Fallback.pinner")}
          </p>
        )}
        <p className="truncate text-xs text-ink-muted">
          {pin.title || location}
        </p>
      </div>
    </button>
  );
}