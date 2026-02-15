import { Place } from "@/types/place";
import { randomUUID } from "crypto";

export function normalizeGooglePlace(p: any): Place {
  return {
    id: randomUUID(),
    googlePlaceId: p.place_id,

    name: p.name,
    city: "Athens",
    address: p.vicinity,

    lat: p.geometry?.location?.lat,
    lng: p.geometry?.location?.lng,

    categories: mapGoogleTypes(p.types),
    tags: [],

    rating: p.rating,
    reviewCount: p.user_ratings_total,

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

function mapGoogleTypes(types: string[]) {
  if (!types) return ["other"];

  if (types.includes("restaurant")) return ["restaurant"];
  if (types.includes("cafe")) return ["cafe"];
  if (types.includes("museum")) return ["museum"];
  if (types.includes("park")) return ["park"];
  if (types.includes("tourist_attraction")) return ["landmark"];

  return ["other"];
}