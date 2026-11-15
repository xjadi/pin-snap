"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  countryFlag,
  type MapPin,
  type PinSummary,
  type PinFilter,
} from "@/lib/pin";

type GroupBy = "country" | "city";

export default function SummaryPanel({
  pins,
  title,
  summary,
  locale = "en",
  activeFilter = null,
  onFilter,
}: {
  pins: MapPin[];
  title: string;
  summary: PinSummary;
  locale?: string;
  activeFilter?: PinFilter | null;
  onFilter?: (f: PinFilter | null) => void;
}) {
  const t = useTranslations("Summary");
  const [groupBy, setGroupBy] = useState<GroupBy>("country");

  const citiesFlat = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of summary.byCountry) {
      for (const city of c.cities) {
        counts.set(city.name, (counts.get(city.name) ?? 0) + city.count);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, locale));
  }, [summary, locale]);

  if (summary.totalPins === 0) return null;

  function toggleCountry(name: string) {
    if (!onFilter) return;
    const isActive = activeFilter?.type === "country" && activeFilter.value === name;
    onFilter(isActive ? null : { type: "country", value: name });
  }

  function toggleCity(name: string) {
    if (!onFilter) return;
    const isActive = activeFilter?.type === "city" && activeFilter.value === name;
    onFilter(isActive ? null : { type: "city", value: name });
  }

  const rowBase =
    "font-typewriter flex w-full items-center justify-between px-3 py-2.5 text-sm transition";
  const rowHover = onFilter ? "cursor-pointer hover:bg-surface/40" : "cursor-default";

  return (
    <section className="library-card relative rounded-md p-5 sm:p-6">
      {/* Top Scotch tape holding down the index card */}
      <div
        aria-hidden
        className="scotch-tape absolute -top-3 left-1/2 h-5 w-24 -translate-x-1/2 rotate-1"
      />

      <div className="border-2 border-ink/75 bg-surface/25">
        {/* Library Card Top Metadata Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink/75 px-4 py-3">
          <div>
            <p className="font-typewriter text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
              INDEX CARD · RUNNING LOG
            </p>
            <h2 className="font-display text-lg font-bold tracking-tight text-ink">
              {title}
            </h2>
            {pins.length > 0 && (
              <p className="font-typewriter text-xs text-ink-muted">
                {t("line", {
                  pins: summary.totalPins,
                  countries: summary.totalCountries,
                  cities: summary.totalCities,
                })}
              </p>
            )}
          </div>

          <div className="font-typewriter inline-flex rounded border border-ink/60 bg-surface p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setGroupBy("country")}
              className={`rounded-xs px-3 py-1 font-bold uppercase tracking-wider transition ${
                groupBy === "country"
                  ? "bg-magenta text-white"
                  : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {t("byCountry")}
            </button>
            <button
              type="button"
              onClick={() => setGroupBy("city")}
              className={`rounded-xs px-3 py-1 font-bold uppercase tracking-wider transition ${
                groupBy === "city"
                  ? "bg-magenta text-white"
                  : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {t("byCity")}
            </button>
          </div>
        </div>

        {/* Ruled Index Rows */}
        {groupBy === "country" ? (
          <ul className="divide-y divide-ink/35">
            {summary.byCountry.map((c, idx) => {
              const isCountryActive =
                activeFilter?.type === "country" && activeFilter.value === c.name;
              const showCities = isCountryActive;
              const hasRealCities = c.cities.some(
                (city) => city.name !== t("unnamedCity"),
              );
              return (
                <li key={c.name}>
                  <button
                    type="button"
                    onClick={() => onFilter && toggleCountry(c.name)}
                    className={`${rowBase} ${rowHover} ${
                      isCountryActive ? "bg-magenta/15" : ""
                    }`}
                  >
                    <span
                      className={`flex items-center gap-2.5 font-bold ${
                        isCountryActive ? "text-magenta" : "text-ink"
                      }`}
                    >
                      <span className="text-xs text-ink-muted">
                        {String(idx + 1).padStart(2, "0")}.
                      </span>
                      {hasRealCities && (
                        <span
                          className={`text-xs text-ink-muted transition ${
                            showCities ? "rotate-90" : ""
                          }`}
                        >
                          ▶
                        </span>
                      )}
                      <span aria-hidden className="text-base leading-none">
                        {countryFlag(c.name)}
                      </span>
                      <span>{c.name}</span>
                    </span>
                    <span className="rounded-xs border border-verde/50 bg-verde/15 px-2 py-0.5 text-xs font-bold text-verde">
                      {t("pinCount", { count: c.count })}
                    </span>
                  </button>
                  {showCities && hasRealCities && (
                    <ul className="border-t border-dashed border-ink/30 bg-surface/35 py-2 pl-9 pr-4 space-y-1 text-sm text-ink-muted">
                      {c.cities.map((city) => {
                        const isCityActive =
                          activeFilter?.type === "city" &&
                          activeFilter.value === city.name;
                        return (
                          <li key={city.name}>
                            <button
                              type="button"
                              onClick={() => onFilter && toggleCity(city.name)}
                              className={`font-typewriter flex w-full items-center justify-between rounded px-2.5 py-1 text-left text-xs transition ${
                                isCityActive
                                  ? "bg-magenta/15 font-bold text-magenta"
                                  : "hover:bg-surface/60"
                              }`}
                            >
                              <span>↳ {city.name}</span>
                              <span className="font-bold text-ink">{city.count}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="divide-y divide-ink/35">
            {citiesFlat.map((city, idx) => {
              const isCityActive =
                activeFilter?.type === "city" && activeFilter.value === city.name;
              return (
                <li key={city.name}>
                  <button
                    type="button"
                    onClick={() => onFilter && toggleCity(city.name)}
                    className={`${rowBase} ${rowHover} ${
                      isCityActive ? "bg-magenta/15" : ""
                    }`}
                  >
                    <span
                      className={`flex items-center gap-2.5 font-bold ${
                        isCityActive ? "text-magenta" : "text-ink"
                      }`}
                    >
                      <span className="text-xs text-ink-muted">
                        {String(idx + 1).padStart(2, "0")}.
                      </span>
                      {city.name}
                    </span>
                    <span className="rounded-xs border border-verde/50 bg-verde/15 px-2 py-0.5 text-xs font-bold text-verde">
                      {t("pinCount", { count: city.count })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}