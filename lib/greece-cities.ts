// lib/greece-cities.ts
import citiesData from "../data/greece-cities.json";

export type GreeceCity = {
  // Canonical id i din JSON
  id: string;

  // Alias som resten av appen kan använda (slug = id)
  slug: string;

  name: string;
  localName?: string;
  region: string;
  group?: string;

  lat: number;
  lng: number;

  priority?: number;
  tags?: string[];

  // (framtid) valfritt – om du vill per stad
  defaultRadiusMeters?: number;

  // (framtid) valfritt – flera punkter för stora områden/öar
  searchAreas?: Array<{ lat: number; lng: number; radius?: number }>;

  // (framtid) valfritt – om du vill styra kategorier
  preferredTypes?: string[];
};

type GreeceCitiesJson = {
  schemaVersion?: number;
  country?: string;
  defaultRadiusMeters?: number;
  cities: Array<any>;
};

const data = citiesData as GreeceCitiesJson;

function normalizeId(value: any): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeCity(raw: any): GreeceCity | null {
  // Din JSON använder "id". Vi accepterar även "slug" som fallback.
  const id = normalizeId(raw?.id ?? raw?.slug);
  if (!id) return null;

  // Gör slug till exakt samma som id för att undvika drift.
  const slug = id;

  const lat = Number(raw?.lat);
  const lng = Number(raw?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const searchAreas = Array.isArray(raw?.searchAreas)
    ? raw.searchAreas
        .map((a: any) => ({
          lat: Number(a?.lat),
          lng: Number(a?.lng),
          radius: typeof a?.radius === "number" ? a.radius : undefined
        }))
        .filter((a: { lat: number; lng: number }) => Number.isFinite(a.lat) && Number.isFinite(a.lng))
    : undefined;

  return {
    id,
    slug,
    name: String(raw?.name ?? ""),
    localName: raw?.localName ? String(raw.localName) : undefined,
    region: String(raw?.region ?? ""),
    group: raw?.group ? String(raw.group) : undefined,
    lat,
    lng,
    priority: typeof raw?.priority === "number" ? raw.priority : undefined,
    tags: Array.isArray(raw?.tags) ? raw.tags.map(String) : undefined,

    defaultRadiusMeters: typeof raw?.defaultRadiusMeters === "number" ? raw.defaultRadiusMeters : undefined,
    searchAreas,
    preferredTypes: Array.isArray(raw?.preferredTypes) ? raw.preferredTypes.map(String) : undefined
  };
}

// Bygg en gång (snabbare + stabilare)
const ALL_CITIES: GreeceCity[] = (data.cities ?? [])
  .map(normalizeCity)
  .filter((c): c is GreeceCity => Boolean(c))
  .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

export function getAllCities(): GreeceCity[] {
  return ALL_CITIES;
}

export function getCityBySlug(slug: string | null | undefined): GreeceCity | null {
  if (!slug) return null;
  const s = normalizeId(slug);

  return ALL_CITIES.find((c) => c.slug === s || c.id === s) ?? null;
}

export function getDefaultCity(): GreeceCity {
  // Stabil default
  return getCityBySlug("athens") ?? ALL_CITIES[0];
}

export function getGlobalDefaultRadiusMeters(): number {
  const v = Number((data as any)?.defaultRadiusMeters);
  return Number.isFinite(v) && v > 0 ? v : 3000;
}

export function getCityRadiusMeters(city: GreeceCity, overrideRadius?: number): number {
  if (Number.isFinite(overrideRadius) && (overrideRadius as number) > 0) {
    return overrideRadius as number;
  }

  if (Number.isFinite(city.defaultRadiusMeters) && (city.defaultRadiusMeters as number) > 0) {
    return city.defaultRadiusMeters as number;
  }

  return getGlobalDefaultRadiusMeters();
}