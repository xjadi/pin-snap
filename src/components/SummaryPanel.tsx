"use client";

import { useMemo, useState } from "react";
import type { MapPin, PinSummary } from "@/lib/pin";
import { summarizePins } from "@/lib/pin";

type GroupBy = "country" | "city";

export default function SummaryPanel({
  pins,
  title = "Your travel map",
}: {
  pins: MapPin[];
  title?: string;
}) {
  const summary: PinSummary = useMemo(() => summarizePins(pins), [pins]);
  const [groupBy, setGroupBy] = useState<GroupBy>("country");
  const [openCountry, setOpenCountry] = useState<string | null>(null);

  const citiesFlat = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of summary.byCountry) {
      for (const city of c.cities) {
        counts.set(city.name, (counts.get(city.name) ?? 0) + city.count);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [summary]);

  if (summary.totalPins === 0) return null;

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            {title}
          </h2>
          {pins.length > 0 && (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {summary.totalPins} pinned memor{summary.totalPins === 1 ? "y" : "ies"} ·{" "}
              {summary.totalCountries} {summary.totalCountries === 1 ? "country" : "countries"} ·{" "}
              {summary.totalCities} {summary.totalCities === 1 ? "city" : "cities"}
            </p>
          )}
        </div>

        <div className="inline-flex rounded-full border border-stone-300 p-0.5 text-xs dark:border-stone-700">
          <button
            type="button"
            onClick={() => setGroupBy("country")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              groupBy === "country"
                ? "bg-amber-500 text-white"
                : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            }`}
          >
            By country
          </button>
          <button
            type="button"
            onClick={() => setGroupBy("city")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              groupBy === "city"
                ? "bg-amber-500 text-white"
                : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            }`}
          >
            By city
          </button>
        </div>
      </div>

      {groupBy === "country" ? (
        <ul className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
          {summary.byCountry.map((c) => {
            const isOpen = openCountry === c.name;
            const hasRealCities = c.cities.some((city) => city.name !== "(unnamed city)");
            return (
              <li key={c.name}>
                <button
                  type="button"
                  onClick={() => hasRealCities && setOpenCountry(isOpen ? null : c.name)}
                  className={`flex w-full items-center justify-between py-2 ${hasRealCities ? "cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800" : "cursor-default"}`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    {hasRealCities && (
                      <span className={`text-xs text-stone-400 transition ${isOpen ? "rotate-90" : ""}`}>
                        ▶
                      </span>
                    )}
                    {c.name}
                  </span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                    {c.count} pin{c.count === 1 ? "" : "s"}
                  </span>
                </button>
                {isOpen && hasRealCities && (
                  <ul className="mb-3 ml-6 list-disc space-y-1 text-sm text-stone-600 dark:text-stone-400">
                    {c.cities.map((city) => (
                      <li key={city.name} className="flex justify-between gap-3">
                        <span>{city.name}</span>
                        <span className="text-stone-400">{city.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
          {citiesFlat.map((city) => (
            <li key={city.name} className="flex items-center justify-between py-2">
              <span className="font-medium">{city.name}</span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                {city.count} pin{city.count === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}