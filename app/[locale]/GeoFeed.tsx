"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/* ===========================
   TYPES
=========================== */

type PlaceCard = {
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

type ApiPayload = {
  ok: boolean;
  context?: {
    time: string;
    weather: string;
    radius: number;
  };
  sections?: {
    featured?: PlaceCard[];
    hotNow?: PlaceCard[];
    laterToday?: PlaceCard[];
    evening?: PlaceCard[];
    rainy?: PlaceCard[];
  };
};

/* ===========================
   COMPONENT
=========================== */

type Props = {
  citySlug: string;
  audience?: string;
  vibe?: string;
  mobility?: string;
  budget?: string;
};

export default function GeoFeed({
    citySlug,
    audience,
    vibe,
    mobility,
    budget
  }: Props) {
    const t = useTranslations();
  
    const [data, setData] = useState<ApiPayload | null>(null);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      let cancelled = false;
  
      async function load() {
        setLoading(true);
        setData(null); // 🔥 viktigt när stad byts
  
        const params = new URLSearchParams();
  
        // 🔥 alltid skicka en city
if (citySlug && citySlug !== "my-location") {
    params.set("city", citySlug);
  } else {
    // fallback city om my-location
    params.set("city", citySlug === "my-location" ? "athens" : citySlug);
  }
  
        if (audience) params.set("audience", audience);
        if (vibe) params.set("vibe", vibe);
        if (mobility) params.set("mobility", mobility);
        if (budget) params.set("budget", budget);
  
        const baseUrl = `/api/feed?${params.toString()}`;
  
        // 🔵 NORMAL CITY MODE
        if (citySlug !== "my-location") {
          const res = await fetch(baseUrl);
          const json = await res.json();
          if (!cancelled) {
            setData(json);
            setLoading(false);
          }
          return;
        }
  
        // 🔴 MY LOCATION MODE
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const geoUrl = new URL(baseUrl, window.location.origin);
  
              geoUrl.searchParams.set(
                "userLat",
                pos.coords.latitude.toString()
              );
              geoUrl.searchParams.set(
                "userLng",
                pos.coords.longitude.toString()
              );
  
              const res = await fetch(geoUrl.toString());
              const json = await res.json();
  
              if (!cancelled) {
                setData(json);
                setLoading(false);
              }
            },
            async () => {
              const res = await fetch(baseUrl);
              const json = await res.json();
  
              if (!cancelled) {
                setData(json);
                setLoading(false);
              }
            }
          );
        } else {
          const res = await fetch(baseUrl);
          const json = await res.json();
  
          if (!cancelled) {
            setData(json);
            setLoading(false);
          }
        }
      }
  
      load();
  
      return () => {
        cancelled = true;
      };
    }, [citySlug, audience, vibe, mobility, budget]);
  
    if (loading) return null;
    if (!data?.ok) return <div>API error</div>;

  const ctx = data.context;

  return (
    <div className={`fadeWrap ${loading ? "fadeOut" : "fadeIn"}`}>
        {/* CONTEXT INFO */}
      {ctx && (
        <div
          style={{
            fontSize: 12,
            opacity: 0.7,
            marginBottom: 12
          }}
        >
          {new Date(ctx.time).toLocaleString()} ·{" "}
          {ctx.weather} · {ctx.radius}m
        </div>
      )}

      <Section
        title={`⚡ ${t("ui.hotNow")}`}
        items={data.sections?.hotNow ?? []}
      />

      <Section
        title={`🕓 ${t("ui.goodLaterToday")}`}
        items={data.sections?.laterToday ?? []}
      />

      <Section
        title={`🌙 ${t("ui.tonightNearby")}`}
        items={data.sections?.evening ?? []}
      />

      <Section
        title={`🌧 ${t("ui.rainFriendly")}`}
        items={data.sections?.rainy ?? []}
      />
    </div>
  );
}

/* ===========================
   SECTION
=========================== */

function Section({
  title,
  items
}: {
  title: string;
  items: PlaceCard[];
}) {
  if (!items?.length) return null;

  return (
    <section style={{ marginTop: 18 }}>
      <h2 style={{ margin: "0 0 10px 0", fontSize: 16 }}>
        {title}
      </h2>
      <div className="grid">
        {items.map((p) => (
          <Card key={p.place_id} p={p} />
        ))}
      </div>
    </section>
  );
}

/* ===========================
   CARD
=========================== */

function Card({ p }: { p: PlaceCard }) {
  function formatDistance(km?: number) {
    if (km === undefined) return "";
    if (km === 0) return "Here";
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  }

  return (
    <a
      className="card"
      href={p.maps_url}
      target="_blank"
      rel="noreferrer"
    >
      {/* Top row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12
        }}
      >
        <div style={{ fontWeight: 650, lineHeight: 1.2 }}>
          {p.name}
        </div>

        <div
          style={{
            fontSize: 12,
            opacity: 0.7,
            whiteSpace: "nowrap"
          }}
        >
          {formatDistance(p.distance_km)}
          {p.score !== undefined
            ? ` · ${p.score}`
            : ""}
        </div>
      </div>

      {/* Rating row */}
      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
        {p.rating
          ? `⭐ ${p.rating} (${p.user_ratings_total ?? 0}) · `
          : ""}
        {p.vicinity ?? ""}
      </div>

      {/* Live ring */}
      {p.liveVibeIndex !== undefined && (
        <div className="vibeRing" />
      )}
    </a>
  );
}