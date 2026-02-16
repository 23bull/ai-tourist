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

function advancedWeatherScore(
  indoor: boolean,
  live?: {
    temperature: number;
    precipitation: number;
    precipitationProbability: number;
    windSpeed: number;
    cloudCover: number;
  }
) {
  if (!live) return 0.7;

  let score = 1;

  // Regn
  if (live.precipitation > 2 || live.precipitationProbability > 70) {
    if (!indoor) score -= 0.5;
  }

  // Vind (viktigt på öar)
  if (live.windSpeed > 40) {
    score -= indoor ? 0.05 : 0.3;
  }

  // Extrem värme
  if (live.temperature > 34) {
    score -= indoor ? 0 : 0.25;
  }

  // Kallt väder
  if (live.temperature < 8) {
    score -= indoor ? 0 : 0.2;
  }

  // Tjockt molntäcke
  if (live.cloudCover > 85) {
    score -= indoor ? 0 : 0.15;
  }

  return clamp01(score);
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
function timeOfDayFit(
  now: Date,
  types: string[] | undefined
) {
  const hour = now.getHours();
  const t = new Set((types ?? []).map(x => x.toLowerCase()));

  const isMorning = hour >= 6 && hour < 11;
  const isLunch = hour >= 11 && hour < 15;
  const isAfternoon = hour >= 15 && hour < 18;
  const isEvening = hour >= 18 && hour < 23;
  const isLateNight = hour >= 23 || hour < 3;

  let score = 0.7; // neutral baseline

  // MORNING
  if (isMorning) {
    if (t.has("cafe") || t.has("bakery") || t.has("park")) score += 0.25;
    if (t.has("night_club") || t.has("bar")) score -= 0.3;
  }

  // LUNCH
  if (isLunch) {
    if (t.has("restaurant") || t.has("meal_takeaway")) score += 0.25;
  }

  // AFTERNOON
  if (isAfternoon) {
    if (t.has("museum") || t.has("tourist_attraction") || t.has("park")) score += 0.2;
  }

  // EVENING
  if (isEvening) {
    if (t.has("restaurant") || t.has("bar")) score += 0.25;
  }

  // LATE NIGHT
  if (isLateNight) {
    if (t.has("bar") || t.has("night_club")) score += 0.3;
    if (t.has("museum") || t.has("park")) score -= 0.3;
  }

  return clamp01(score);
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

  if (vibe === "culture" && (t.has("museum") || t.has("art_gallery")))
    boost += 0.2;

  if (vibe === "views" && (t.has("tourist_attraction") || t.has("park")))
    boost += 0.15;

  if (vibe === "nightlife" && (t.has("bar") || t.has("night_club")))
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

  const timeScore = timeOfDayFit(
    params.now,
    params.types
  );


  // 🔥 Hard cap distance
  const hardCap =
    params.prefs.mobility === "walk" ? 7.5 : 25;

  const hardPenalty = km > hardCap ? 0 : 1;

  const indoor = guessIndoor(params.types);
  const wfit = advancedWeatherScore(
    indoor,
    params.liveWeather
  );

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
    ? { dist: 1.2, open: 2, weather: 4, rating: 1.2, pref: 1.5, budget: 1, time: 1.2 }
    : params.section === "evening"
    ? { dist: 1.5, open: 2.5, weather: 1.2, rating: 1.3, pref: 1.6, budget: 1, time: 2 }
    : { dist: 2, open: 3, weather: 2, rating: 1.5, pref: 1.8, budget: 1, time: 1.5 };

    const raw =
    weights.dist * distScore +
    weights.open * openScore +
    weights.weather * wfit +
    weights.rating * ratingScore +
    weights.pref * prefBoost +
    weights.budget * budgetScore +
    weights.time * timeScore;

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