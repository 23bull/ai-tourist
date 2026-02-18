import {
  getAllCities,
  getCityBySlug,
  getDefaultCity
} from "../../lib/greece-cities";

import PreferencesBar from "./components/PreferencesBar";
import GeoFeed from "./GeoFeed";

/* ===========================
   TYPES
=========================== */

type PlaceCard = {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  vicinity?: number | string;
  maps_url: string;
  distance_km?: number;
  score?: number;
  reasonTokens?: string[];
  liveVibeState?: string;
  liveVibeIndex?: number;
};

/* ===========================
   HELPERS
=========================== */

function pickFirst(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

/* ===========================
   PAGE
=========================== */

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  const sp = (await searchParams) ?? {};

  const allCities = getAllCities();
  const cities = [
    { id: "my-location", name: "📍 My location" },
    ...allCities.map((c) => ({
      id: c.slug,
      name: `${c.name} · ${c.region}`
    }))
  ];

  const citySlug = pickFirst(sp.city);
  const defaultCity = getDefaultCity();
  const isMyLocation = citySlug === "my-location";

const selectedCity =
  !isMyLocation
    ? getCityBySlug(citySlug) ?? defaultCity
    : defaultCity; // fallback bara för UI

  const audience = pickFirst(sp.audience);
  const vibe = pickFirst(sp.vibe);
  const mobility = pickFirst(sp.mobility);
  const budget = pickFirst(sp.budget);

  return (
    <>
      <div className="hero">
        <div className="heroOverlay">
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <PreferencesBar
              cities={cities}
              defaultCityId={selectedCity.slug}
            />
          </div>
        </div>
      </div>

      <main className="pageContent">
      <GeoFeed
  citySlug={isMyLocation ? "my-location" : selectedCity.slug}
  audience={audience ?? undefined}
  vibe={vibe ?? undefined}
  mobility={mobility ?? undefined}
  budget={budget ?? undefined}
/>
      </main>
    </>
  );
}