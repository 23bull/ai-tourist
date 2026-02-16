import { Place, PlaceCategory } from "@/types/place";
import { randomUUID } from "crypto";

export function normalizeGooglePlace(p: any): Place {
  const lat = Number(p?.geometry?.location?.lat);
  const lng = Number(p?.geometry?.location?.lng);

  return {
    id: randomUUID(),
    googlePlaceId: String(p?.place_id ?? randomUUID()),

    name: String(p?.name ?? "Unknown place"),
    city: "Athens", // kan senare göras dynamisk
    address: String(p?.vicinity ?? ""),

    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,

    categories: mapGoogleTypes(p?.types),
    tags: [],

    rating: typeof p?.rating === "number" ? p.rating : undefined,
    reviewCount:
      typeof p?.user_ratings_total === "number"
        ? p.user_ratings_total
        : 0,

    aiScore: 0,
    popularityScore: 0,
    freshnessScore: 0,

    isFeatured: false,
    isSponsored: false,
    isHiddenGem: false,

    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mapGoogleTypes(types?: string[]): PlaceCategory[] {
  if (!types) return ["other"];

  const normalized = types.map((t) => t.toLowerCase());

  if (normalized.includes("restaurant")) return ["restaurant"];
  if (normalized.includes("cafe")) return ["cafe"];
  if (normalized.includes("museum")) return ["museum"];
  if (normalized.includes("park")) return ["park"];
  if (normalized.includes("tourist_attraction")) return ["landmark"];
  if (normalized.includes("bar") || normalized.includes("night_club"))
    return ["nightlife"];

  return ["other"];
}