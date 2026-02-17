import { NextResponse } from "next/server";
import { scorePlace } from "@/lib/scorePlace";
import {
  getCityBySlug,
  getDefaultCity,
  getCityRadiusMeters
} from "../../../lib/greece-cities";

export const runtime = "nodejs";

type Weather = "sunny" | "cloudy" | "rain" | "storm";
type Mobility = "walk" | "car" | "boat";
type Budget = "low" | "mid" | "high";
type Vibe = "food" | "culture" | "views" | "nightlife" | "relax";
type Audience = "general" | "solo" | "couples" | "friends" | "family";

function parseEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T
): T {
  if (!value) return fallback;
  const v = value.toLowerCase();
  return (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;
}

async function fetchNearbyByType(args: {
  key: string;
  lat: number;
  lng: number;
  radius: number;
  type: string;
}) {
  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${args.lat},${args.lng}` +
    `&radius=${args.radius}` +
    `&type=${encodeURIComponent(args.type)}` +
    `&key=${encodeURIComponent(args.key)}`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  const data = await res.json();

  const results = (data.results ?? []).map((p: any) => ({
    place_id: p.place_id,
    name: p.name ?? "Place",
    rating: p.rating,
    user_ratings_total: p.user_ratings_total,
    vicinity: p.vicinity,
    types: (p.types ?? []) as string[],
    open_now: Boolean(p?.opening_hours?.open_now),
    price_level:
      typeof p.price_level === "number"
        ? p.price_level
        : undefined,
    placeLat: p?.geometry?.location?.lat,
    placeLng: p?.geometry?.location?.lng
  }));

  return { results };
}

export async function GET(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "Missing GOOGLE_MAPS_API_KEY" },
      { status: 500 }
    );
  }

  const urlObj = new URL(req.url);

  const citySlug = urlObj.searchParams.get("city");
  const selectedCity =
    getCityBySlug(citySlug) ?? getDefaultCity();

  const radiusFromUrl = Number(
    urlObj.searchParams.get("radius") ?? "0"
  );

  const radius = getCityRadiusMeters(
    selectedCity,
    Number.isFinite(radiusFromUrl) && radiusFromUrl > 0
      ? radiusFromUrl
      : undefined
  );

  const weather =
    (urlObj.searchParams.get("weather") as Weather) ??
    "sunny";

  const prefs = {
    city: selectedCity.slug,
    audience: parseEnum<Audience>(
      urlObj.searchParams.get("audience"),
      ["general", "solo", "couples", "friends", "family"] as const,
      "general"
    ),
    vibe: parseEnum<Vibe>(
      urlObj.searchParams.get("vibe"),
      ["food", "culture", "views", "nightlife", "relax"] as const,
      "culture"
    ),
    mobility: parseEnum<Mobility>(
      urlObj.searchParams.get("mobility"),
      ["walk", "car", "boat"] as const,
      "walk"
    ),
    budget: parseEnum<Budget>(
      urlObj.searchParams.get("budget"),
      ["low", "mid", "high"] as const,
      "mid"
    )
  };

  const now = new Date();
  const userLat = selectedCity.lat;
  const userLng = selectedCity.lng;

  const typesToFetch = [
    "tourist_attraction",
    "museum",
    "natural_feature",
    "park",
    "restaurant",
    "cafe",
    "bar"
  ];

  const fetched = await Promise.all(
    typesToFetch.map((type) =>
      fetchNearbyByType({
        key,
        lat: userLat,
        lng: userLng,
        radius,
        type
      })
    )
  );

  const byId = new Map<string, any>();

  for (const pack of fetched) {
    for (const p of pack.results) {
      if (!p.place_id) continue;

      if (!byId.has(p.place_id)) {
        byId.set(p.place_id, p);
      } else {
        const prev = byId.get(p.place_id);
        const mergedTypes = Array.from(
          new Set([
            ...(prev.types ?? []),
            ...(p.types ?? [])
          ])
        );
        byId.set(p.place_id, {
          ...prev,
          ...p,
          types: mergedTypes
        });
      }
    }
  }

  const places = Array.from(byId.values())
    .map((p) => ({
      ...p,
      placeLat: Number(p.placeLat ?? userLat),
      placeLng: Number(p.placeLng ?? userLng),
      maps_url:
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          p.name
        )}&query_place_id=${encodeURIComponent(
          p.place_id
        )}`
    }))
    .filter(
      (p) =>
        Number.isFinite(p.placeLat) &&
        Number.isFinite(p.placeLng)
    )
    .slice(0, 80);

  const liveWeather = undefined;

  function buildSection(
    section: "hotNow" | "laterToday" | "evening" | "rainy",
    n: number
  ) {
    const scored = places.map((p) => {
      const s = scorePlace({
        placeId: p.place_id,
        featuredIds: selectedCity.featuredPlaceIds,
        liveWeather,
        now,
        userLat,
        userLng,
        weather,
        placeLat: p.placeLat,
        placeLng: p.placeLng,
        rating: p.rating,
        userRatingsTotal: p.user_ratings_total,
        openNow: p.open_now,
        types: p.types,
        priceLevel: p.price_level,
        section,
        prefs
      });

      return {
        place_id: p.place_id,
  name: p.name,
  rating: p.rating,
  user_ratings_total: p.user_ratings_total,
  vicinity: p.vicinity,
  maps_url: p.maps_url,
  distance_km: Number(s.km.toFixed(1)),
  score: s.score,
  liveVibeIndex: s.liveVibeIndex,
  liveVibeState: s.liveVibeState
      };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
  }

  function buildFeatured() {
    const featuredIds =
      selectedCity.featuredPlaceIds ?? [];

    if (featuredIds.length === 0) return [];

    const filtered = places.filter((p) =>
      featuredIds.includes(p.place_id)
    );

    const scored = filtered.map((p) => {
      const s = scorePlace({
        placeId: p.place_id,
        featuredIds,
        liveWeather,
        now,
        userLat,
        userLng,
        weather,
        placeLat: p.placeLat,
        placeLng: p.placeLng,
        rating: p.rating,
        userRatingsTotal: p.user_ratings_total,
        openNow: p.open_now,
        types: p.types,
        priceLevel: p.price_level,
        section: "hotNow",
        prefs
      });

      return {
        place_id: p.place_id,
  name: p.name,
  rating: p.rating,
  user_ratings_total: p.user_ratings_total,
  vicinity: p.vicinity,
  maps_url: p.maps_url,
  distance_km: Number(s.km.toFixed(1)),
  score: s.score,
  liveVibeIndex: s.liveVibeIndex,
  liveVibeState: s.liveVibeState
      };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }

  return NextResponse.json(
    {
      ok: true,
      status: "OK",
      context: {
        location: { lat: userLat, lng: userLng },
        time: now.toISOString(),
        weather,
        radius,
        prefs,
        city: {
          id: selectedCity.id,
          slug: selectedCity.slug,
          name: selectedCity.name,
          region: selectedCity.region
        }
      },
      sections: {
        featured: buildFeatured(),
        hotNow: buildSection("hotNow", 6),
        laterToday: buildSection("laterToday", 6),
        evening: buildSection("evening", 6),
        rainy: buildSection("rainy", 6)
      }
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300"
      }
    }
  );
}