"use client";

import React from "react";

export type Place = {
    place_id: string;
    name: string;
    rating?: number;
    user_ratings_total?: number;
    vicinity?: string;
    maps_url: string;
    distance_km?: number;
    score?: number;
    reasonTokens?: string[];
    liveVibeIndex?: number;
  };

type Props = {
  p: Place;
  onOpen: (place: Place) => void;
};

export default function PlaceCard({ p, onOpen }: Props) {
  function handleOpen() {
    onOpen(p);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpen();
    }
  }

  function formatDistance(km?: number) {
    if (km === undefined) return null;
    if (km === 0) return "Here";
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  }

  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${p.name}`}
      style={{ cursor: "pointer" }}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
    >
      {/* Title row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8
        }}
      >
        <div style={{ fontWeight: 600 }}>
          {p.name}
        </div>

        {p.distance_km !== undefined && (
          <div
            style={{
              fontSize: 12,
              opacity: 0.6,
              whiteSpace: "nowrap"
            }}
          >
            {formatDistance(p.distance_km)}
          </div>
        )}
      </div>

      {/* Rating */}
      {p.rating !== undefined && (
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
          ⭐ {p.rating} ({p.user_ratings_total ?? 0})
        </div>
      )}

      {/* Address / vicinity */}
      {p.vicinity && (
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
          {p.vicinity}
        </div>
      )}
    </div>
  );
}