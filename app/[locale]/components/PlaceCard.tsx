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

  liveLabel?: {
    text: string;
    level: "high" | "midHigh" | "mid" | "low";
  };

  reasonLabel?: string;
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

  function getLiveColor(level: "high" | "midHigh" | "mid" | "low") {
    switch (level) {
      case "high":
        return "#ff4d4f";
      case "midHigh":
        return "#ff8c00";
      case "mid":
        return "#ffc107";
      case "low":
        return "#2ecc71";
      default:
        return "#666";
    }
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
      {/* TITLE ROW */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "flex-start"
        }}
      >
        <div style={{ fontWeight: 600 }}>{p.name}</div>

        {p.distance_km !== undefined && (
          <div
            style={{
              fontSize: 12,
              opacity: 0.55,
              whiteSpace: "nowrap"
            }}
          >
            {formatDistance(p.distance_km)}
          </div>
        )}
      </div>

{/* LIVE BADGE */}
{p.liveLabel ? (
  <div className={`experience-badge ${p.liveLabel.level}`}>
    {p.liveLabel.text}
  </div>
) : (
  <div style={{ color: "red" }}>NO LIVE LABEL</div>
)}
      {/* RATING */}
      {p.rating !== undefined && (
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>
          ⭐ {p.rating} ({p.user_ratings_total ?? 0})
        </div>
      )}

      {/* ADDRESS */}
      {p.vicinity && (
        <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
          {p.vicinity}
        </div>
      )}

      {/* REASON LABEL */}
      {p.reasonLabel && (
        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>
          {p.reasonLabel}
        </div>
      )}
    </div>
  );
}