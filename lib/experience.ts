type Section = "hotNow" | "laterToday" | "evening" | "rainy";

type Params = {
  liveVibeIndex?: number;
  section: Section;
  weather?: string;
  rating?: number;
  types?: string[];
  audience?: string;
};

export function buildExperience({
  liveVibeIndex = 0,
  section,
  weather,
  rating,
  types = [],
  audience
}: Params) {
  return {
    liveLabel: buildLiveLabel(liveVibeIndex),
    reasonLabel: buildReasonLabel({
      section,
      weather,
      rating,
      types,
      audience
    })
  };
}

function buildLiveLabel(vibe: number) {
  if (vibe > 80) return { text: "High Energy", level: "vibrant" };
  if (vibe > 60) return { text: "Lively", level: "social" };
  if (vibe > 40) return { text: "Easygoing", level: "relaxed" };
  return { text: "Low Key", level: "quiet" };
}

function buildReasonLabel(args: {
  section: string;
  weather?: string;
  rating?: number;
  types: string[];
  audience?: string;
}) {
  const { section, weather, rating, types, audience } = args;

  if (section === "hotNow") {
    if (rating && rating >= 4.5) {
      return "Highly rated and lively right now";
    }
    return "Buzzing with activity at the moment";
  }

  if (section === "evening") {
    if (types?.includes("bar") || types?.includes("night_club")) {
      return "Great energy for tonight";
    }
    return "Nice atmosphere for the evening";
  }

  if (section === "laterToday") {
    return "Great option for later today";
  }

  return "Worth checking out";
}