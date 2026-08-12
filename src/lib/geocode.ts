// Geocoding helpers using Nominatim (OpenStreetMap). Free, no key.
// Be polite — only used when a user adds/edits a pin or searches a place.

const NOMINATIM_UA = "photo-pin-map/1.0 (jade.acidburn@gmail.com)";

export interface PlaceInfo {
  city: string;
  country: string;
}

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
}

// Pull the best-available locality name out of a Nominatim address object.
function cityFromAddress(a: Record<string, string | undefined> | undefined): string {
  if (!a) return "";
  const city =
    a.city ||
    a.town ||
    a.village ||
    a.municipality ||
    a.subdistrict ||
    a.county ||
    a.state ||
    a.state_district ||
    "";
  return String(city);
}

// Reverse-geocode a lat/lng to { city, country }.
export async function reverseGeocode(lat: number, lng: number): Promise<PlaceInfo> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": NOMINATIM_UA },
      next: { revalidate: 0 },
    });
    if (!res.ok) return { city: "", country: "" };
    const data = await res.json();
    const a = data?.address ?? {};
    return { city: cityFromAddress(a), country: String(a.country ?? "") };
  } catch {
    return { city: "", country: "" };
  }
}

// Forward-geocode: search a place name → up to 5 candidates with lat/lng + city/country.
export async function searchPlace(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
    q,
  )}&addressdetails=1&limit=5`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": NOMINATIM_UA },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      display_name?: string;
      lat?: string;
      lon?: string;
      address?: Record<string, string | undefined>;
    }>;
    return data
      .map((d) => {
        const lat = Number(d.lat);
        const lng = Number(d.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const a = d.address ?? {};
        return {
          displayName: String(d.display_name ?? ""),
          lat,
          lng,
          city: cityFromAddress(a),
          country: String(a.country ?? ""),
        };
      })
      .filter((r): r is GeocodeResult => r !== null);
  } catch {
    return [];
  }
}