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
  citySlug && citySlug !== "my-location"
    ? getCityBySlug(citySlug) ?? getDefaultCity()
    : getDefaultCity();

  // 🔥 USER GEO FROM QUERY
  const userLatParam = urlObj.searchParams.get("userLat");
  const userLngParam = urlObj.searchParams.get("userLng");

  const userLat =
    userLatParam !== null ? Number(userLatParam) : undefined;

  const userLng =
    userLngParam !== null ? Number(userLngParam) : undefined;

  // 🔥 ONLY USE GEO IF CITY MATCHES
const sameCity =
selectedCity.slug === urlObj.searchParams.get("city");

const originLat =
  userLat !== undefined && !Number.isNaN(userLat)
    ? userLat
    : selectedCity.lat;

const originLng =
  userLng !== undefined && !Number.isNaN(userLng)
    ? userLng
    : selectedCity.lng;

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

  const typesToFetch = [
    "tourist_attraction",
    "museum",
    "natural_feature",
    "park",
    "restaurant",
    "cafe",
    "bar"
  ];

  // 🔥 USE ORIGIN LAT/LNG HERE
  const fetched = await Promise.all(
    typesToFetch.map((type) =>
      fetchNearbyByType({
        key,
        lat: originLat,
        lng: originLng,
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
        byId.set(p.place_id, {
          ...prev,
          ...p,
          types: Array.from(
            new Set([
              ...(prev.types ?? []),
              ...(p.types ?? [])
            ])
          )
        });
      }
    }
  }

  const places = Array.from(byId.values())
    .map((p) => ({
      ...p,
      placeLat: Number(p.placeLat ?? originLat),
      placeLng: Number(p.placeLng ?? originLng),
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
    const scored = places.map((p) => {   // ✅ p definieras här
  
      const s = scorePlace({
        userLat: originLat,
        userLng: originLng,
        placeId: p.place_id,
        featuredIds: selectedCity.featuredPlaceIds,
        liveWeather,
        now,
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

  return NextResponse.json(
    {
      ok: true,
      context: {
        lat: originLat,
        lng: originLng,
        time: now.toISOString(),
        weather,
        radius,
        prefs
      },
      sections: {
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