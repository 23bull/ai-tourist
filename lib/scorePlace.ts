// scorePlace.ts
import { advancedWeatherScore } from "@/lib/weather";

type Weather = "sunny" | "cloudy" | "rain" | "storm";
type Mobility = "walk" | "car" | "boat";
type Budget = "low" | "mid" | "high";
type Vibe = "food" | "culture" | "views" | "nightlife" | "relax";
type Audience = "general" | "solo" | "couples" | "friends" | "family";

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normTypes(types?: string[]) {
  return new Set((types ?? []).map((x) => x.toLowerCase()));
}

function guessIndoor(types?: string[]) {
  const t = normTypes(types);
  const indoorTypes = [
    "museum",
    "art_gallery",
    "church",
    "shopping_mall",
    "aquarium",
    "library",
    "movie_theater"
  ];
  return indoorTypes.some((x) => t.has(x));
}

function mobilityDistanceMultiplier(mobility: Mobility) {
  if (mobility === "walk") return 1.1;
  if (mobility === "car") return 0.85;
  if (mobility === "boat") return 0.95;
  return 1;
}

function timeOfDayFit(now: Date, types?: string[]) {
  const hour = now.getHours();
  const t = normTypes(types);

  let score = 0.7;

  if (hour >= 6 && hour < 11) {
    if (t.has("cafe") || t.has("bakery")) score += 0.25;
  }

  if (hour >= 18 && hour < 23) {
    if (t.has("restaurant") || t.has("bar")) score += 0.25;
  }

  if (hour >= 23 || hour < 3) {
    if (t.has("bar") || t.has("night_club")) score += 0.3;
  }

  return clamp01(score);
}

function classifyVibe(score: number) {
  if (score >= 90) return "electric";
  if (score >= 80) return "buzzing";
  if (score >= 65) return "lively";
  if (score >= 50) return "calm";
  return "quiet";
}

export function scorePlace(params: {
  placeId?: string;
  featuredIds?: string[];
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
  prefs: {
    city?: string;
    audience: Audience;
    vibe: Vibe;
    mobility: Mobility;
    budget: Budget;
  };
  liveWeather?: {
    temperature: number;
    precipitation: number;
    precipitationProbability: number;
    windSpeed: number;
    cloudCover: number;
  };
}) {
  const km = haversineKm(
    params.userLat,
    params.userLng,
    params.placeLat,
    params.placeLng
  );

  const indoor = guessIndoor(params.types);

  const timeScore = timeOfDayFit(params.now, params.types);

  const weatherScore = advancedWeatherScore(
    indoor,
    params.liveWeather
  );

  const distScore =
    clamp01(1 - km / 10) *
    mobilityDistanceMultiplier(params.prefs.mobility);

  const ratingScore =
    params.rating && params.userRatingsTotal
      ? clamp01(
          (params.rating / 5) *
            Math.log10(params.userRatingsTotal + 1)
        )
      : 0.4;

  const openScore = params.openNow ? 1 : 0.3;

  // -------- MAIN SCORE --------

  const raw =
    2 * distScore +
    2 * openScore +
    2 * weatherScore +
    1.5 * ratingScore +
    1.5 * timeScore;

  const max = 2 + 2 + 2 + 1.5 + 1.5;

  const score = Math.round((raw / max) * 100);

  // -------- LIVE VIBE --------

  const popularityScore = clamp01(
    Math.log10((params.userRatingsTotal ?? 0) + 1) / 3
  );

  const liveRaw =
    2.5 * timeScore +
    2.5 * weatherScore +
    2 * openScore +
    2 * popularityScore +
    1.5 * distScore;

  const liveMax = 2.5 + 2.5 + 2 + 2 + 1.5;

  let liveVibeIndex = Math.round(
    (liveRaw / liveMax) * 100
  );
  
  // 🚫 Om uttryckligen stängt → ingen live-energi
  if (params.openNow === false) {
    return {
      score,
      km,
      liveVibeIndex: 0,
      liveVibeState: "closed"
    };
  }

  const liveVibeState = classifyVibe(liveVibeIndex);

  return {
    score,
    km,
    liveVibeIndex,
    liveVibeState
  };
}

export function buildExperienceLabel(args: {
  liveVibeIndex: number;
  section: string;
  weather: string;
  rating?: number;
  types?: string[];
  liveVibeState?: string;
}) {
  const { liveVibeState, section, weather, rating, types } = args;

  const energy =
  liveVibeState === "electric"
    ? "Electric atmosphere"
    : liveVibeState === "buzzing"
    ? "Social energy"
    : liveVibeState === "lively"
    ? "Vibrant but relaxed"
    : liveVibeState === "calm"
    ? "Relaxed ambiance"
    : liveVibeState === "quiet"
    ? "Quiet setting"
    : "Currently closed";

  const timeTone =
    section === "evening"
      ? "after-dark presence"
      : section === "laterToday"
      ? "golden-hour charm"
      : "daytime appeal";

  const weatherTone =
    weather === "sunny"
      ? "sunlit mood"
      : weather === "rain"
      ? "cozy refuge"
      : "";

  return [energy, timeTone, weatherTone]
    .filter(Boolean)
    .join(" · ");
}