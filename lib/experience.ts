type Section = "hotNow" | "laterToday" | "evening" | "rainy";
type Weather = "sunny" | "cloudy" | "rain" | "storm";

type Args = {
  liveVibeIndex?: number;
  section: Section;
  weather: Weather;
  rating?: number;
  types?: string[];
};

export function buildExperienceLabel({
  liveVibeIndex,
  section,
  weather,
  rating,
  types
}: Args): string {

  if (section === "hotNow") {
    if ((liveVibeIndex ?? 0) > 70) return "🔥 Happening right now";
    if ((liveVibeIndex ?? 0) > 40) return "✨ Good energy here";
    return "👀 Worth checking out";
  }

  if (section === "evening") {
    if (types?.includes("bar") || types?.includes("night_club")) {
      return "🍸 Great for tonight";
    }
    return "🌙 Nice evening atmosphere";
  }

  if (section === "rainy") {
    return "☔ Cozy if it rains";
  }

  if (section === "laterToday") {
    if ((rating ?? 0) >= 4.7) return "⭐ Loved by visitors";
    return "🌤 Nice spot later today";
  }

  return "✨ A good experience";
}