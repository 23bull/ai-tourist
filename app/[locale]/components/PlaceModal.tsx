"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Place } from "./PlaceCard";

type Props = {
  place: Place;
  onClose: () => void;
};

export default function PlaceModal({ place, onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function formatDistance(km?: number) {
    if (!km) return "";
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  }

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 99999
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "90%",
          maxWidth: 500,
          background: "#111",
          color: "white",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)"
        }}
      >
        <h2 style={{ margin: 0 }}>{place.name}</h2>

        {place.rating && (
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            ⭐ {place.rating} ({place.user_ratings_total ?? 0})
          </div>
        )}

        {place.vicinity && (
          <div style={{ marginTop: 6, opacity: 0.7 }}>
            {place.vicinity}
          </div>
        )}

        {place.distance_km !== undefined && (
          <div style={{ marginTop: 4, opacity: 0.7 }}>
            {formatDistance(place.distance_km)} away
          </div>
        )}

        {/* LIVE BADGE */}
{place.liveLabel && (
  <div
    style={{
      display: "inline-block",
      padding: "6px 14px",
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 600,
      marginTop: 14,
      background:
        place.liveLabel.level === "high"
          ? "#ff4d4f"
          : place.liveLabel.level === "midHigh"
          ? "#ff8c00"
          : place.liveLabel.level === "mid"
          ? "#ffc107"
          : "#2ecc71",
      color: "#fff"
    }}
  >
    {place.liveLabel.text}
  </div>
)}

{/* REASON */}
{place.reasonLabel && (
  <div style={{ marginTop: 12, opacity: 0.9 }}>
    {place.reasonLabel}
  </div>
)}

        <a
          href={place.maps_url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            marginTop: 22,
            padding: "14px 16px",
            borderRadius: 14,
            textAlign: "center",
            background: "linear-gradient(90deg,#1e90ff,#4aa3ff)",
            fontWeight: 600,
            textDecoration: "none",
            color: "white"
          }}
        >
          📍 Directions
        </a>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}