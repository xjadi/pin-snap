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
  const rotations = ["-1.5deg", "1.2deg", "-0.8deg", "1.6deg"];
  const rotation = rotations[index % rotations.length];
  const tapeRotation = index % 2 === 0 ? "-rotate-2" : "rotate-2";
  const dateStamp = formatCardDate(pin.visited_at || pin.created_at);

  return (
    <button
      onClick={onClick}
      className="polaroid group mb-6 mt-2 block w-full break-inside-avoid text-left"
      style={{ transform: `rotate(${rotation})` }}
    >
      {/* Translucent Scotch tape strip across the top of the Polaroid */}
      <div
        aria-hidden
        className={`scotch-tape absolute -top-3 left-1/2 z-10 h-5 w-20 -translate-x-1/2 ${tapeRotation}`}
      />

      <div className="relative aspect-[4/3] w-full overflow-hidden border border-border/60 bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pin.photo_url}
          alt={pin.title ?? location}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
          }}
        />
        {dateStamp && (
          <span className="font-typewriter absolute bottom-1.5 right-1.5 rounded-xs bg-ink/75 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-paper backdrop-blur-xs">
            {dateStamp}
          </span>
        )}
      </div>

      <div className="px-2.5 pt-2.5 pb-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display truncate text-sm font-bold text-ink">
            {pin.title || location}
          </p>
          {showOwner && (
            <span className="font-typewriter shrink-0 text-[11px] font-bold text-magenta">
              @{pin.owner_display_name || t("Fallback.pinner")}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="font-typewriter truncate text-xs text-ink-muted">
            📍 {location}
          </p>
          {pin.notes && (
            <span className="font-typewriter shrink-0 text-[10px] uppercase tracking-wider text-ink-muted/80">
              ✎ MEMO
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function formatCardDate(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}.${dd}.${yy}`;
}