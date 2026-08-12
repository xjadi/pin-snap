export interface MapPin {
  id: string;
  photo_url: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  notes: string;
  created_at: string;
  owner_display_name: string;
  owner_avatar_url: string;
  owner_id: string;
  title: string | null;
  visited_at: string | null;
  tags: string | null;
}

export interface CityCount {
  name: string;
  count: number;
}

export interface CountryGroup {
  name: string;
  count: number;
  cities: CityCount[];
}

export interface PinSummary {
  totalPins: number;
  totalCountries: number;
  totalCities: number;
  byCountry: CountryGroup[];
}

const KEY = (s: string) => (s ?? "").trim();
const PLACEHOLDER = new Set(["", "unknown", "unnamed"]);

function visible(s: string): boolean {
  return !PLACEHOLDER.has(KEY(s).toLowerCase());
}

export function summarizePins(pins: MapPin[]): PinSummary {
  const totalPins = pins.length;
  const countryMap = new Map<string, Map<string, number>>();

  for (const p of pins) {
    const country = KEY(p.country);
    const city = KEY(p.city);
    if (!country) continue;
    if (!countryMap.has(country)) countryMap.set(country, new Map());
    const cityMap = countryMap.get(country)!;
    const c = visible(city) ? city : "(unnamed city)";
    cityMap.set(c, (cityMap.get(c) ?? 0) + 1);
  }

  const byCountry: CountryGroup[] = Array.from(countryMap.entries())
    .map(([name, cityMap]) => {
      const cities: CityCount[] = Array.from(cityMap.entries())
        .map(([cname, count]) => ({ name: cname, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
      return {
        name,
        count: cities.reduce((n, c) => n + c.count, 0),
        cities,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const totalCountries = byCountry.length;
  const totalCities = new Set(
    pins
      .map((p) => KEY(p.city))
      .filter((c) => c && !PLACEHOLDER.has(c.toLowerCase())),
  ).size;

  return { totalPins, totalCountries, totalCities, byCountry };
}