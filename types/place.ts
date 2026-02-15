export type PlaceCategory =
  | "landmark"
  | "restaurant"
  | "cafe"
  | "bar"
  | "museum"
  | "park"
  | "viewpoint"
  | "activity"
  | "hidden"
  | "other";

export type Place = {
  id: string;                     // internt ID (uuid)
  googlePlaceId: string;          // koppling till Google

  name: string;
  city: string;
  address?: string;

  lat: number;
  lng: number;

  categories: PlaceCategory[];
  tags: string[];

  rating?: number;
  reviewCount?: number;

  aiScore: number;                // vår ranking
  popularityScore: number;
  freshnessScore: number;
  proximityScore?: number;

  isFeatured: boolean;
  isSponsored: boolean;
  sponsorWeight?: number;

  isHiddenGem: boolean;

  createdAt: Date;
  updatedAt: Date;
};