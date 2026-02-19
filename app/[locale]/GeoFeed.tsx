"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import PlaceCard from "./components/PlaceCard";
import PlaceModal from "./components/PlaceModal";

/* ===========================
   TYPES
=========================== */

type Place = {
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
    featured?: Place[];
    hotNow?: Place[];
    laterToday?: Place[];
    evening?: Place[];
    rainy?: Place[];
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
  const [activePlace, setActivePlace] = useState<Place | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setData(null);

      const params = new URLSearchParams();

      if (citySlug && citySlug !== "my-location") {
        params.set("city", citySlug);
      } else {
        params.set("city", "athens"); // fallback
      }

      if (audience) params.set("audience", audience);
      if (vibe) params.set("vibe", vibe);
      if (mobility) params.set("mobility", mobility);
      if (budget) params.set("budget", budget);

      const baseUrl = `/api/feed?${params.toString()}`;

      // Normal city mode
      if (citySlug !== "my-location") {
        const res = await fetch(baseUrl);
        const json = await res.json();

        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
        return;
      }

      // My location mode
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
      {/* Context info */}
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
  onOpen={setActivePlace}
/>

<Section
  title={`🕓 ${t("ui.goodLaterToday")}`}
  items={data.sections?.laterToday ?? []}
  onOpen={setActivePlace}
/>

<Section
  title={`🌙 ${t("ui.tonightNearby")}`}
  items={data.sections?.evening ?? []}
  onOpen={setActivePlace}
/>

<Section
  title={`🌧 ${t("ui.rainFriendly")}`}
  items={data.sections?.rainy ?? []}
  onOpen={setActivePlace}
/>
{activePlace && (
  <PlaceModal
    place={activePlace}
    onClose={() => setActivePlace(null)}
  />
)}

      {/* 🔥 Här kommer modal sen */}
      {activePlace && (
        <div style={{ marginTop: 20 }}>
          <strong>{activePlace.name}</strong>
        </div>
      )}
    </div>
  );
}

/* ===========================
   SECTION
=========================== */

function Section({
  title,
  items,
  onOpen
}: {
  title: string;
  items: Place[];
  onOpen: (place: Place) => void;
}) {
  if (!items.length) return null;

  return (
    <section style={{ marginTop: 18 }}>
      <h2 style={{ margin: "0 0 10px 0", fontSize: 16 }}>
        {title}
      </h2>
      <div className="grid">
        {items.map((p) => (
          <PlaceCard
            key={p.place_id}
            p={p}
            onOpen={onOpen}
          />
        ))}
        
      </div>
    </section>
  );
}