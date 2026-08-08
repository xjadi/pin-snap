// Reverse-geocode a lat/lng to { city, country } using Nominatim (OpenStreetMap).
// Free, no key. Be polite — only used when a user adds a pin.
export interface PlaceInfo {
  city: string;
  country: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<PlaceInfo> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        // Nominatim asks for an identifying UA; send a friendly one.
        "User-Agent": "photo-pin-map/1.0 (hello@example.com)",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return { city: "", country: "" };
    const data = await res.json();
    const a = data?.address ?? {};
    const city =
      a.city ||
      a.town ||
      a.village ||
      a.municipality ||
      a.subdistrict ||
      a.county ||
      a.state ||
      "";
    const country = a.country ?? "";
    return { city: String(city), country: String(country) };
  } catch {
    return { city: "", country: "" };
  }
}