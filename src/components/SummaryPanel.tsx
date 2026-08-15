"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { MapPin, PinSummary, PinFilter } from "@/lib/pin";

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
    "flex w-full items-center justify-between py-2 transition";
  const rowHover = onFilter ? "cursor-pointer hover:bg-surface-2" : "cursor-default";

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">
            {title}
          </h2>
          {pins.length > 0 && (
            <p className="text-sm text-ink-muted">
              {t("line", {
                pins: summary.totalPins,
                countries: summary.totalCountries,
                cities: summary.totalCities,
              })}
            </p>
          )}
        </div>

        <div className="inline-flex rounded-full border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setGroupBy("country")}
            className={`rounded-full px-3 py-1 font-medium transition ${
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
            className={`rounded-full px-3 py-1 font-medium transition ${
              groupBy === "city"
                ? "bg-magenta text-white"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {t("byCity")}
          </button>
        </div>
      </div>

      {groupBy === "country" ? (
        <ul className="mt-4 divide-y divide-border">
          {summary.byCountry.map((c) => {
            const isCountryActive =
              activeFilter?.type === "country" && activeFilter.value === c.name;
            // Auto-reveal the city sub-list when this country is the active filter.
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
                    isCountryActive ? "bg-magenta/10" : ""
                  }`}
                >
                  <span
                    className={`flex items-center gap-2 font-medium rounded-full px-2 -ml-2 ${
                      isCountryActive ? "text-magenta" : "text-ink"
                    }`}
                  >
                    {hasRealCities && (
                      <span
                        className={`text-xs text-ink-muted transition ${
                          showCities ? "rotate-90" : ""
                        }`}
                      >
                        ▶
                      </span>
                    )}
                    {c.name}
                  </span>
                  <span className="rounded-full bg-verde/15 px-2 py-0.5 text-xs font-medium text-verde">
                    {t("pinCount", { count: c.count })}
                  </span>
                </button>
                {showCities && hasRealCities && (
                  <ul className="mb-3 ml-4 space-y-1 text-sm text-ink-muted">
                    {c.cities.map((city) => {
                      const isCityActive =
                        activeFilter?.type === "city" &&
                        activeFilter.value === city.name;
                      return (
                        <li key={city.name}>
                          <button
                            type="button"
                            onClick={() => onFilter && toggleCity(city.name)}
                            className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-left transition ${
                              isCityActive
                                ? "bg-magenta/10 text-magenta"
                                : "hover:bg-surface-2"
                            }`}
                          >
                            <span>{city.name}</span>
                            <span className="text-ink-muted">{city.count}</span>
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
        <ul className="mt-4 divide-y divide-border">
          {citiesFlat.map((city) => {
            const isCityActive =
              activeFilter?.type === "city" && activeFilter.value === city.name;
            return (
              <li key={city.name}>
                <button
                  type="button"
                  onClick={() => onFilter && toggleCity(city.name)}
                  className={`${rowBase} ${rowHover} ${
                    isCityActive ? "bg-magenta/10" : ""
                  }`}
                >
                  <span
                    className={`font-medium px-2 -ml-2 rounded-full ${
                      isCityActive ? "text-magenta" : "text-ink"
                    }`}
                  >
                    {city.name}
                  </span>
                  <span className="rounded-full bg-verde/15 px-2 py-0.5 text-xs font-medium text-verde">
                    {t("pinCount", { count: city.count })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}