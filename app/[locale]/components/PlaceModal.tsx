"use client";

import React from "react";

type Place = {
    place_id: string;
    name: string;
    rating?: number;
    user_ratings_total?: number;
    vicinity?: string | number;
    distance_km?: number;
  
    maps_url?: string;
    phone?: string;
    website?: string;
    bookable?: boolean;
  };

type Props = {
  place: Place;
  onClose: () => void;
};

export default function PlaceModal({ place, onClose }: Props) {
  function formatDistance(km?: number) {
    if (km === undefined) return "";
    if (km === 0) return "You are here";
    if (km < 1) return `${Math.round(km * 1000)} m away`;
    return `${km.toFixed(1)} km away`;
  }

  return (
    <div
      className="modalOverlay"
      onClick={onClose}
    >
      <div
        className="modalCard"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="modalHeader">
          <h2>{place.name}</h2>
          <button onClick={onClose} className="closeBtn">
            ✕
          </button>
        </div>

        {/* META */}
        <div className="modalMeta">
          {place.rating !== undefined && (
            <div>
              ⭐ {place.rating} ({place.user_ratings_total ?? 0})
            </div>
          )}

          {place.vicinity && (
            <div>{place.vicinity}</div>
          )}

          {place.distance_km !== undefined && (
            <div>{formatDistance(place.distance_km)}</div>
          )}
        </div>

        {/* EXPERIENCE BLOCK */}
        <div className="modalBody">
          <p>
            This place fits your current vibe and location.
          </p>
        </div>

        {/* CTA (kommer byggas ut senare) */}
        <div className="modalActions">
  {place.maps_url && (
    <a
      href={place.maps_url}
      target="_blank"
      rel="noreferrer"
      className="primaryBtn"
    >
      📍 Directions
    </a>
  )}

  {place.phone && (
    <a
      href={`tel:${place.phone}`}
      className="secondaryBtn"
    >
      📞 Call
    </a>
  )}

  {place.website && (
    <a
      href={place.website}
      target="_blank"
      rel="noreferrer"
      className="secondaryBtn"
    >
      🌐 Website
    </a>
  )}

  {place.bookable && (
    <button
      className="bookBtn"
      onClick={() => alert("Booking flow coming soon")}
    >
      📅 Book now
    </button>
  )}
</div>
      </div>
    </div>
  );
}