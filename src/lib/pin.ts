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

export interface PinFilter {
  type: "country" | "city";
  value: string;
}

const KEY = (s: string) => (s ?? "").trim();

export function filterPins(pins: MapPin[], f: PinFilter | null): MapPin[] {
  if (!f) return pins;
  if (f.type === "country") return pins.filter((p) => KEY(p.country) === f.value);
  return pins.filter((p) => KEY(p.city) === f.value);
}

/** Compute a bounding box [min, max] (lng/lat) for a set of pins. Null if empty. */
export function pinsBounds(
  pins: MapPin[],
): [[number, number], [number, number]] | null {
  if (pins.length === 0) return null;
  let minLng = pins[0].lng;
  let maxLng = pins[0].lng;
  let minLat = pins[0].lat;
  let maxLat = pins[0].lat;
  for (const p of pins) {
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
  }
  // Guard against degenerate single-point bounds (avoid zero-area viewport).
  if (minLng === maxLng) {
    minLng -= 0.01;
    maxLng += 0.01;
  }
  if (minLat === maxLat) {
    minLat -= 0.01;
    maxLat += 0.01;
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
const PLACEHOLDER = new Set(["", "unknown", "unnamed"]);

function visible(s: string): boolean {
  return !PLACEHOLDER.has(KEY(s).toLowerCase());
}

export function summarizePins(pins: MapPin[], locale: string = "en"): PinSummary {
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
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, locale));
      return {
        name,
        count: cities.reduce((n, c) => n + c.count, 0),
        cities,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, locale));

  const totalCountries = byCountry.length;
  const totalCities = new Set(
    pins
      .map((p) => KEY(p.city))
      .filter((c) => c && !PLACEHOLDER.has(c.toLowerCase())),
  ).size;

  return { totalPins, totalCountries, totalCities, byCountry };
}

function isoToFlag(iso2: string): string {
  const code = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🌍";
  return String.fromCodePoint(
    0x1f1e6 + code.charCodeAt(0) - 65,
    0x1f1e6 + code.charCodeAt(1) - 65,
  );
}

const COUNTRY_ALIASES: Record<string, string> = {
  thailand: "TH",
  ไทย: "TH",
  ประเทศไทย: "TH",
  ราชอาณาจักรไทย: "TH",
  japan: "JP",
  ญี่ปุ่น: "JP",
  ประเทศญี่ปุ่น: "JP",
  日本: "JP",
  "south korea": "KR",
  korea: "KR",
  "republic of korea": "KR",
  เกาหลีใต้: "KR",
  เกาหลี: "KR",
  ประเทศเกาหลีใต้: "KR",
  대한민국: "KR",
  한국: "KR",
  taiwan: "TW",
  ไต้หวัน: "TW",
  台灣: "TW",
  臺灣: "TW",
  中華民國: "TW",
  china: "CN",
  จีน: "CN",
  ประเทศจีน: "CN",
  中国: "CN",
  中华人民共和国: "CN",
  "hong kong": "HK",
  ฮ่องกง: "HK",
  香港: "HK",
  macau: "MO",
  macao: "MO",
  มาเก๊า: "MO",
  澳門: "MO",
  澳门: "MO",
  vietnam: "VN",
  "viet nam": "VN",
  "việt nam": "VN",
  เวียดนาม: "VN",
  ประเทศเวียดนาม: "VN",
  laos: "LA",
  ลาว: "LA",
  ประเทศลาว: "LA",
  "ສປປ ລາວ": "LA",
  ປະເທດລາວ: "LA",
  cambodia: "KH",
  กัมพูชา: "KH",
  ประเทศกัมพูชา: "KH",
  កម្ពុជា: "KH",
  myanmar: "MM",
  burma: "MM",
  พม่า: "MM",
  เมียนมา: "MM",
  เมียนมาร์: "MM",
  မြန်မာ: "MM",
  malaysia: "MY",
  มาเลเซีย: "MY",
  ประเทศมาเลเซีย: "MY",
  singapore: "SG",
  สิงคโปร์: "SG",
  ประเทศสิงคโปร์: "SG",
  singapura: "SG",
  indonesia: "ID",
  อินโดนีเซีย: "ID",
  philippines: "PH",
  pilipinas: "PH",
  ฟิลิปปินส์: "PH",
  india: "IN",
  อินเดีย: "IN",
  australia: "AU",
  ออสเตรเลีย: "AU",
  "new zealand": "NZ",
  นิวซีแลนด์: "NZ",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  สหรัฐอเมริกา: "US",
  อเมริกา: "US",
  "united kingdom": "GB",
  uk: "GB",
  "great britain": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  สหราชอาณาจักร: "GB",
  อังกฤษ: "GB",
  france: "FR",
  ฝรั่งเศส: "FR",
  germany: "DE",
  deutschland: "DE",
  เยอรมนี: "DE",
  italy: "IT",
  italia: "IT",
  อิตาลี: "IT",
  spain: "ES",
  españa: "ES",
  สเปน: "ES",
  switzerland: "CH",
  schweiz: "CH",
  suisse: "CH",
  svizzera: "CH",
  "schweiz/suisse/svizzera/svizra": "CH",
  สวิตเซอร์แลนด์: "CH",
  netherlands: "NL",
  "the netherlands": "NL",
  nederland: "NL",
  เนเธอร์แลนด์: "NL",
  belgium: "BE",
  belgië: "BE",
  belgique: "BE",
  "belgië / belgique / belgien": "BE",
  เบลเยียม: "BE",
  austria: "AT",
  österreich: "AT",
  ออสเตรีย: "AT",
  greece: "GR",
  ελλάδα: "GR",
  กรีซ: "GR",
  turkey: "TR",
  türkiye: "TR",
  ตุรกี: "TR",
  russia: "RU",
  россия: "RU",
  รัสเซีย: "RU",
  canada: "CA",
  แคนาดา: "CA",
  mexico: "MX",
  méxico: "MX",
  เม็กซิโก: "MX",
  brazil: "BR",
  brasil: "BR",
  บราซิล: "BR",
  norway: "NO",
  norge: "NO",
  นอร์เวย์: "NO",
  sweden: "SE",
  sverige: "SE",
  สวีเดน: "SE",
  denmark: "DK",
  danmark: "DK",
  เดนมาร์ก: "DK",
  finland: "FI",
  suomi: "FI",
  ฟินแลนด์: "FI",
  iceland: "IS",
  ísland: "IS",
  ไอซ์แลนด์: "IS",
  portugal: "PT",
  โปรตุเกส: "PT",
  czechia: "CZ",
  "czech republic": "CZ",
  česko: "CZ",
  เช็ก: "CZ",
  poland: "PL",
  polska: "PL",
  โปแลนด์: "PL",
  hungary: "HU",
  magyarország: "HU",
  ฮังการี: "HU",
  nepal: "NP",
  เนปาล: "NP",
  "เนปาล (nepal)": "NP",
  "united arab emirates": "AE",
  uae: "AE",
  สหรัฐอาหรับเอมิเรตส์: "AE",
  egypt: "EG",
  อียิปต์: "EG",
};

let dynamicCountryMap: Map<string, string> | null = null;

function getCountryIsoMap(): Map<string, string> {
  if (dynamicCountryMap) return dynamicCountryMap;
  const map = new Map<string, string>();

  for (const [k, v] of Object.entries(COUNTRY_ALIASES)) {
    map.set(k.toLowerCase(), v);
  }

  try {
    const enNames = new Intl.DisplayNames(["en"], { type: "region" });
    const thNames = new Intl.DisplayNames(["th"], { type: "region" });

    for (let i = 65; i <= 90; i++) {
      for (let j = 65; j <= 90; j++) {
        const code = String.fromCharCode(i, j);
        const en = enNames.of(code);
        if (en && en !== code && !/^[A-Z]{2}$/.test(en)) {
          map.set(en.toLowerCase(), code);
        }
        const th = thNames.of(code);
        if (th && th !== code && !/^[A-Z]{2}$/.test(th)) {
          const thClean = th.toLowerCase();
          map.set(thClean, code);
          map.set(`ประเทศ${thClean}`, code);
          if (thClean.startsWith("ประเทศ")) {
            map.set(thClean.replace(/^ประเทศ/, ""), code);
          }
        }
      }
    }
  } catch {
    // Fallback to static COUNTRY_ALIASES if Intl.DisplayNames is unavailable.
  }

  dynamicCountryMap = map;
  return map;
}

/** Return the flag emoji for a country name (supports EN, TH, native Nominatim names, and ISO codes). */
export function countryFlag(countryName: string): string {
  const raw = KEY(countryName);
  if (!raw) return "🌍";
  if (/^[A-Za-z]{2}$/.test(raw)) return isoToFlag(raw);

  const map = getCountryIsoMap();
  const normalized = raw.toLowerCase();
  const direct = map.get(normalized);
  if (direct) return isoToFlag(direct);

  // Nominatim sometimes returns slash-separated multilingual names like "Schweiz/Suisse/Svizzera"
  if (normalized.includes("/")) {
    for (const part of normalized.split("/")) {
      const hit = map.get(part.trim());
      if (hit) return isoToFlag(hit);
    }
  }

  return "🌍";
}