// lib/greece-cities.ts
import citiesData from "../data/greece-cities.json";

export type GreeceCity = {
  id: string;
  slug: string;

  name: string;
  localName?: string;
  region: string;
  group?: string;

  lat: number;
  lng: number;

  priority?: number;
  tags?: string[];

  isActive?: boolean;

  defaultRadiusMeters?: number;

  searchAreas?: Array<{
    lat: number;
    lng: number;
    radius?: number;
  }>;

  preferredTypes?: string[];

  featuredPlaceIds?: string[];
};

type GreeceCitiesJson = {
  schemaVersion?: number;
  country?: string;
  defaultRadiusMeters?: number;
  cities: unknown[];
};

const data = citiesData as GreeceCitiesJson;

function normalizeId(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((v) => String(v)).filter(Boolean);
}

function normalizeCity(raw: any): GreeceCity | null {
  const id = normalizeId(raw?.id ?? raw?.slug);
  if (!id) return null;

  const lat = Number(raw?.lat);
  const lng = Number(raw?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const searchAreas = Array.isArray(raw?.searchAreas)
    ? raw.searchAreas
        .map((a: any) => ({
          lat: Number(a?.lat),
          lng: Number(a?.lng),
          radius:
            typeof a?.radius === "number" && a.radius > 0
              ? a.radius
              : undefined
        }))
        .filter(
          (a: { lat: number; lng: number }) =>
            Number.isFinite(a.lat) && Number.isFinite(a.lng)
        )
    : undefined;

  return {
    id,
    slug: id,

    name: String(raw?.name ?? ""),
    localName: raw?.localName
      ? String(raw.localName)
      : undefined,

    region: String(raw?.region ?? ""),
    group: raw?.group
      ? String(raw.group)
      : undefined,

    lat,
    lng,

    priority:
      typeof raw?.priority === "number"
        ? raw.priority
        : undefined,

    tags: toStringArray(raw?.tags),

    isActive:
      raw?.isActive === false ? false : true,

    defaultRadiusMeters:
      typeof raw?.defaultRadiusMeters === "number" &&
      raw.defaultRadiusMeters > 0
        ? raw.defaultRadiusMeters
        : undefined,

    searchAreas,

    preferredTypes: toStringArray(raw?.preferredTypes),

    featuredPlaceIds: toStringArray(raw?.featuredPlaceIds)
  };
}

/*
  Bygg en gång och frys listan.
  Endast aktiva städer.
*/
const ALL_CITIES: ReadonlyArray<GreeceCity> = Object.freeze(
  (data.cities ?? [])
    .map(normalizeCity)
    .filter((c): c is GreeceCity => c !== null && c.isActive !== false)
    .sort(
      (a, b) =>
        (a.priority ?? 999) -
        (b.priority ?? 999)
    )
);

export function getAllCities(): ReadonlyArray<GreeceCity> {
  return ALL_CITIES;
}

export function getCityBySlug(
  slug: string | null | undefined
): GreeceCity | null {

  const s = normalizeId(slug);

  return (
    ALL_CITIES.find(
      (c) =>
        c.slug === s || c.id === s
    ) ?? null
  );
}

export function getDefaultCity(): GreeceCity {
  return (
    getCityBySlug("athens") ??
    ALL_CITIES[0]
  );
}

export function getGlobalDefaultRadiusMeters(): number {
  const v = Number(
    (data as any)?.defaultRadiusMeters
  );

  return Number.isFinite(v) && v > 0
    ? v
    : 3000;
}

export function getCityRadiusMeters(
  city: GreeceCity,
  overrideRadius?: number
): number {
  if (
    Number.isFinite(overrideRadius) &&
    (overrideRadius as number) > 0
  ) {
    return overrideRadius as number;
  }

  if (
    Number.isFinite(
      city.defaultRadiusMeters
    ) &&
    (city.defaultRadiusMeters as number) >
        0
  ) {
    return city.defaultRadiusMeters as number;
  }

  return getGlobalDefaultRadiusMeters();
}

/*
  🔥 Ny funktion – framtida monetisering
  Kolla om ett placeId är featured i en stad
*/
export function isFeaturedPlace(
  city: GreeceCity,
  placeId: string
): boolean {
  return (
    city.featuredPlaceIds?.includes(
      placeId
    ) ?? false
  );
}