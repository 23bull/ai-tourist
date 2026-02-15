// scorePlace.ts

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
    "synagogue",
    "mosque",
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

function preferenceBoost(
  types: string[] | undefined,
  vibe: Vibe,
  audience: Audience
) {
  const t = normTypes(types);
  let boost = 0;

  if (vibe === "food" && (t.has("restaurant") || t.has("cafe")))
    boost += 0.2;

  if (
    vibe === "culture" &&
    (t.has("museum") || t.has("art_gallery"))
  )
    boost += 0.2;

  if (
    vibe === "views" &&
    (t.has("tourist_attraction") || t.has("park"))
  )
    boost += 0.15;

  if (
    vibe === "nightlife" &&
    (t.has("bar") || t.has("night_club"))
  )
    boost += 0.15;

  if (vibe === "relax" && (t.has("park") || t.has("spa")))
    boost += 0.15;

  if (audience === "family" && (t.has("park") || t.has("aquarium")))
    boost += 0.1;

  if (audience === "couples" && t.has("restaurant"))
    boost += 0.08;

  if (audience === "friends" && t.has("bar"))
    boost += 0.08;

  return clamp01(boost);
}

function mobilityDistanceMultiplier(mobility: Mobility) {
  if (mobility === "walk") return 1.1;
  if (mobility === "car") return 0.85;
  if (mobility === "boat") return 0.95;
  return 1;
}

function budgetFit(
  priceLevel: number | undefined,
  budget: Budget
) {
  if (priceLevel == null) return 0.65;

  if (budget === "low")
    return priceLevel <= 1
      ? 1
      : priceLevel === 2
      ? 0.6
      : 0.25;

  if (budget === "mid")
    return priceLevel <= 2
      ? 1
      : priceLevel === 3
      ? 0.6
      : 0.35;

  return priceLevel >= 3
    ? 1
    : priceLevel === 2
    ? 0.75
    : 0.45;
}

function buildReasonText(args: {
  openNow?: boolean;
  km: number;
  indoor: boolean;
  weatherScore: number;
  rating?: number;
  vibe: Vibe;
}) {
  const parts: string[] = [];

  if (args.openNow) parts.push("Öppet nu");

  if (args.weatherScore > 0.85)
    parts.push(
      args.indoor
        ? "Bra i detta väder"
        : "Perfekt väder"
    );

  if (args.km < 1.5) parts.push("Nära");

  if ((args.rating ?? 0) >= 4.5)
    parts.push("Högt betyg");

  parts.push(`Matchar: ${args.vibe}`);

  return parts.slice(0, 3).join(" · ");
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

  section:
    | "hotNow"
    | "laterToday"
    | "evening"
    | "rainy";

  prefs: {
    city?: string;
    audience: Audience;
    vibe: Vibe;
    mobility: Mobility;
    budget: Budget;
  };
}) {
  const km = haversineKm(
    params.userLat,
    params.userLng,
    params.placeLat,
    params.placeLng
  );

  // 🔥 Hard cap distance
  const hardCap =
    params.prefs.mobility === "walk" ? 7.5 : 25;

  const hardPenalty = km > hardCap ? 0 : 1;

  const indoor = guessIndoor(params.types);
  const wfit = weatherFit(indoor, params.weather);

  const distScore =
    clamp01(1 - km / 10) *
    mobilityDistanceMultiplier(
      params.prefs.mobility
    ) *
    hardPenalty;

  const ratingScore =
    params.rating && params.userRatingsTotal
      ? clamp01(
          (params.rating / 5) *
            Math.log10(
              params.userRatingsTotal + 1
            )
        )
      : 0.4;

  const openScore = params.openNow ? 1 : 0.3;

  const prefBoost = preferenceBoost(
    params.types,
    params.prefs.vibe,
    params.prefs.audience
  );

  const budgetScore = budgetFit(
    params.priceLevel,
    params.prefs.budget
  );

  const weights =
    params.section === "rainy"
      ? {
          dist: 1.2,
          open: 2,
          weather: 4,
          rating: 1.2,
          pref: 1.5,
          budget: 1
        }
      : params.section === "evening"
      ? {
          dist: 1.5,
          open: 2.5,
          weather: 1.2,
          rating: 1.3,
          pref: 1.6,
          budget: 1
        }
      : {
          dist: 2,
          open: 3,
          weather: 2,
          rating: 1.5,
          pref: 1.8,
          budget: 1
        };

  const raw =
    weights.dist * distScore +
    weights.open * openScore +
    weights.weather * wfit +
    weights.rating * ratingScore +
    weights.pref * prefBoost +
    weights.budget * budgetScore;

  const max = Object.values(weights).reduce(
    (s, v) => s + v,
    0
  );

  const baseScore = Math.round(
    (raw / max) * 100
  );

  // 🔥 Featured boost
  const isFeatured =
    params.placeId &&
    params.featuredIds?.includes(
      params.placeId
    );

  const featuredBoost = isFeatured ? 20 : 0;

  const finalScore = Math.min(
    100,
    baseScore + featuredBoost
  );

  return {
    score: finalScore,
    km,
    indoor,
    wfit,
    reason: isFeatured
      ? "Utvalt · " +
        buildReasonText({
          openNow: params.openNow,
          km,
          indoor,
          weatherScore: wfit,
          rating: params.rating,
          vibe: params.prefs.vibe
        })
      : buildReasonText({
          openNow: params.openNow,
          km,
          indoor,
          weatherScore: wfit,
          rating: params.rating,
          vibe: params.prefs.vibe
        })
  };
}