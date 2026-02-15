import { NextResponse } from "next/server";
import { getCityBySlug, getDefaultCity, getCityRadiusMeters } from "../../../lib/greece-cities";

export const runtime = "nodejs";

type Weather = "sunny" | "cloudy" | "rain" | "storm";
type Mobility = "walk" | "car" | "boat";
type Budget = "low" | "mid" | "high";
type Vibe = "food" | "culture" | "views" | "nightlife" | "relax";
type Audience = "general" | "solo" | "couples" | "friends" | "family";

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function distanceScore(km: number) {
  return clamp01(1 - km / 10);
}

function normTypes(types: string[] | undefined) {
  return new Set((types ?? []).map((x) => String(x).toLowerCase()));
}

function guessIndoor(types: string[] | undefined) {
  const t = normTypes(types);
  const indoorTypes = [
    "museum",
    "art_gallery",
    "church",
    "synagogue",
    "mosque",
    "hindu_temple",
    "shopping_mall",
    "aquarium",
    "library",
    "movie_theater"
  ];
  return indoorTypes.some((x) => t.has(x));
}

function weatherFit(indoor: boolean, weather: Weather) {
  const rainy = weather === "rain" || weather === "storm";
  if (indoor) return rainy ? 1.0 : 0.7;
  return rainy ? 0.25 : 1.0;
}

function timeOfDayFit(now: Date, types: string[] | undefined) {
  const h = now.getHours();
  const t = normTypes(types);
  const eveningish = t.has("bar") || t.has("restaurant") || t.has("tourist_attraction");

  let fit = 0.7;
  if (h >= 10 && h < 17) fit += 0.1;
  if (h >= 17 && h <= 22 && eveningish) fit += 0.15;
  return clamp01(fit);
}

function buildReasonText(args: {
  openNow?: boolean;
  km: number;
  wfit: number;
  indoor: boolean;
  rating?: number;
  prefs?: { vibe: Vibe; audience: Audience; mobility: Mobility; budget: Budget; city?: string };
}) {
  const parts: string[] = [];
  if (args.openNow) parts.push("Öppet nu");
  if (args.wfit > 0.85) parts.push(args.indoor ? "Bra i detta väder" : "Perfekt väder");
  if (args.km <= 1.5) parts.push("Nära");
  if ((args.rating ?? 0) >= 4.5) parts.push("Högt betyg");

  if (args.prefs?.vibe && args.prefs.vibe !== "relax") parts.push(`Matchar: ${args.prefs.vibe}`);

  if (parts.length === 0) parts.push("Rekommenderas");
  return parts.slice(0, 3).join(" · ");
}

function parseEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  if (!value) return fallback;
  const v = value.toLowerCase();
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function preferenceBoost(types: string[] | undefined, vibe: Vibe, audience: Audience) {
  const t = normTypes(types);
  let boost = 0;

  if (vibe === "food") {
    if (t.has("restaurant") || t.has("cafe") || t.has("bakery") || t.has("meal_takeaway")) boost += 0.18;
  } else if (vibe === "culture") {
    if (t.has("museum") || t.has("art_gallery") || t.has("church")) boost += 0.18;
  } else if (vibe === "views") {
    if (t.has("tourist_attraction") || t.has("natural_feature") || t.has("park")) boost += 0.12;
  } else if (vibe === "nightlife") {
    if (t.has("bar") || t.has("night_club") || t.has("restaurant")) boost += 0.12;
  } else if (vibe === "relax") {
    if (t.has("park") || t.has("spa") || t.has("natural_feature")) boost += 0.12;
  }

  if (audience === "family") {
    if (t.has("park") || t.has("aquarium") || t.has("museum") || t.has("zoo") || t.has("amusement_park")) boost += 0.12;
  } else if (audience === "couples") {
    if (t.has("restaurant") || t.has("tourist_attraction") || t.has("museum")) boost += 0.06;
  } else if (audience === "friends") {
    if (t.has("bar") || t.has("restaurant") || t.has("night_club")) boost += 0.06;
  } else if (audience === "solo") {
    if (t.has("museum") || t.has("cafe") || t.has("art_gallery")) boost += 0.05;
  }

  return clamp01(boost);
}

function mobilityDistanceMultiplier(mobility: Mobility) {
  if (mobility === "walk") return 1.1;
  if (mobility === "car") return 0.85;
  if (mobility === "boat") return 0.95;
  return 1.0;
}

function budgetFit(priceLevel: number | undefined, budget: Budget) {
  if (priceLevel === undefined || priceLevel === null) return 0.65;

  if (budget === "low") return priceLevel <= 1 ? 1.0 : priceLevel === 2 ? 0.6 : 0.25;
  if (budget === "mid") return priceLevel === 1 || priceLevel === 2 ? 1.0 : priceLevel === 3 ? 0.6 : 0.35;
  return priceLevel >= 3 ? 1.0 : priceLevel === 2 ? 0.75 : 0.45;
}

function scorePlace(params: {
  now: Date;
  userLat: number;
  userLng: number;
  weather: Weather;
  placeLat: number;
  placeLng: number;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  types?: string[];
  priceLevel?: number;
  section: "hotNow" | "laterToday" | "evening" | "rainy";
  prefs: { city?: string; audience: Audience; vibe: Vibe; mobility: Mobility; budget: Budget };
}) {
  const km = haversineKm(params.userLat, params.userLng, params.placeLat, params.placeLng);

  // Gör walk striktare så man inte får “fel ort”
  const hardKmCap = params.prefs.mobility === "walk" ? 7.5 : 25;
  const hardPenalty = km > hardKmCap ? 0.0 : 1.0;

  const dist = clamp01(distanceScore(km) * mobilityDistanceMultiplier(params.prefs.mobility)) * hardPenalty;

  const indoor = guessIndoor(params.types);
  const wfit = weatherFit(indoor, params.weather);
  const tfit = timeOfDayFit(params.now, params.types);

  const rating = clamp01(((params.rating ?? 0) - 3.5) / 1.5);
  const popularity = clamp01(Math.log10((params.userRatingsTotal ?? 0) + 1) / 4);

  const open = params.openNow ? 1 : 0;

  const pref = preferenceBoost(params.types, params.prefs.vibe, params.prefs.audience);
  const bfit = budgetFit(params.priceLevel, params.prefs.budget);

  const W =
    params.section === "hotNow"
      ? { dist: 2.0, open: 3.0, weather: 2.0, time: 1.0, rating: 1.5, pop: 1.0, pref: 1.8, budget: 0.8 }
      : params.section === "rainy"
      ? { dist: 1.2, open: 2.5, weather: 4.0, time: 0.8, rating: 1.2, pop: 1.0, pref: 1.5, budget: 0.8 }
      : params.section === "evening"
      ? { dist: 1.5, open: 2.5, weather: 1.2, time: 2.5, rating: 1.3, pop: 1.0, pref: 1.6, budget: 0.8 }
      : { dist: 1.5, open: 2.0, weather: 1.5, time: 1.5, rating: 1.2, pop: 1.0, pref: 1.4, budget: 0.8 };

  const raw =
    W.dist * dist +
    W.open * open +
    W.weather * wfit +
    W.time * tfit +
    W.rating * rating +
    W.pop * popularity +
    W.pref * pref +
    W.budget * bfit;

  const max = Object.values(W).reduce((s, v) => s + v, 0);
  const score = Math.round((raw / max) * 100);

  return { score, km, indoor, wfit };
}

// Multi-typ hämtning (NearBy Search tar bara en type per anrop)
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
    price_level: typeof p.price_level === "number" ? p.price_level : undefined,
    placeLat: p?.geometry?.location?.lat,
    placeLng: p?.geometry?.location?.lng,
  }));

  return { status: data.status as string | undefined, results };
}

export async function GET(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "Missing GOOGLE_MAPS_API_KEY" }, { status: 500 });

  const urlObj = new URL(req.url);

  // Stad från URL
  const citySlug = urlObj.searchParams.get("city");
  const selectedCity = getCityBySlug(citySlug) ?? getDefaultCity();

  // Radius: URL override -> city default -> global default
  const radiusFromUrl = Number(urlObj.searchParams.get("radius") ?? "0");
  const radius = getCityRadiusMeters(selectedCity, Number.isFinite(radiusFromUrl) && radiusFromUrl > 0 ? radiusFromUrl : undefined);

  const weather = (urlObj.searchParams.get("weather") as Weather) ?? "sunny";

  const prefs = {
    city: selectedCity.slug,
    audience: parseEnum<Audience>(urlObj.searchParams.get("audience"), ["general", "solo", "couples", "friends", "family"] as const, "general"),
    vibe: parseEnum<Vibe>(urlObj.searchParams.get("vibe"), ["food", "culture", "views", "nightlife", "relax"] as const, "culture"),
    mobility: parseEnum<Mobility>(urlObj.searchParams.get("mobility"), ["walk", "car", "boat"] as const, "walk"),
    budget: parseEnum<Budget>(urlObj.searchParams.get("budget"), ["low", "mid", "high"] as const, "mid")
  };

  const now = new Date();

  // Basuppsättning typer. (Kan senare styras per stad via preferredTypes i JSON.)
  const typesToFetch = ["tourist_attraction", "museum", "natural_feature", "park", "restaurant", "cafe", "bar"];

  const userLat = selectedCity.lat;
  const userLng = selectedCity.lng;

  // Hämta parallellt
  const fetched = await Promise.all(
    typesToFetch.map((type) => fetchNearbyByType({ key, lat: userLat, lng: userLng, radius, type }))
  );

  // Dedupe på place_id
  const byId = new Map<string, any>();
  for (const pack of fetched) {
    for (const p of pack.results) {
      if (!p.place_id) continue;
      if (!byId.has(p.place_id)) {
        byId.set(p.place_id, p);
      } else {
        // Merge types om vi sett den via annan type
        const prev = byId.get(p.place_id);
        const mergedTypes = Array.from(new Set([...(prev.types ?? []), ...(p.types ?? [])]));
        byId.set(p.place_id, { ...prev, ...p, types: mergedTypes });
      }
    }
  }

  const places = Array.from(byId.values())
    .map((p) => {
      const placeLat = Number(p.placeLat ?? userLat);
      const placeLng = Number(p.placeLng ?? userLng);
      const placeId = String(p.place_id);
      const name = String(p.name ?? "Place");
      return {
        place_id: placeId,
        name,
        rating: p.rating,
        user_ratings_total: p.user_ratings_total,
        vicinity: p.vicinity,
        types: p.types ?? [],
        open_now: p.open_now,
        price_level: p.price_level,
        placeLat,
        placeLng,
        maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(placeId)}`
      };
    })
    // extra sanity: kasta saker som saknar coords
    .filter((p) => Number.isFinite(p.placeLat) && Number.isFinite(p.placeLng))
    // begränsa mängden vi score:ar
    .slice(0, 80);

  function buildSection(section: "hotNow" | "laterToday" | "evening" | "rainy", n: number) {
    const scored = places.map((p) => {
      const s = scorePlace({
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
        reason: buildReasonText({
          openNow: p.open_now,
          km: s.km,
          wfit: s.wfit,
          indoor: s.indoor,
          rating: p.rating,
          prefs
        })
      };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, n);
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
        hotNow: buildSection("hotNow", 6),
        laterToday: buildSection("laterToday", 6),
        evening: buildSection("evening", 6),
        rainy: buildSection("rainy", 6)
      }
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"
      }
    }
  );
}