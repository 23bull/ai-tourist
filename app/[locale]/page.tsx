import {
  getAllCities,
  getCityBySlug,
  getDefaultCity
} from "../../lib/greece-cities";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

import LightningIcon from "./components/LightningIcon";
import PreferencesBar from "./components/PreferencesBar";

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
  liveVibeState?: string;
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
    hotNow: PlaceCard[];
    laterToday: PlaceCard[];
    evening: PlaceCard[];
    rainy: PlaceCard[];
  };
  results?: PlaceCard[];
};

/* ===========================
   HELPERS
=========================== */

function pickFirst(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function renderReason(
  tokens: string[] | undefined,
  t: (key: string, values?: any) => string
) {
  if (!tokens?.length) return null;

  return tokens
    .map((token) => {
      if (token === "openNow") return t("ui.openNow");
      if (token === "nearby") return t("ui.nearby");
      if (token === "highRated") return t("ui.highRated");
      if (token === "perfectWeather") return t("ui.perfectWeather");
      if (token === "goodInWeather") return t("ui.goodInWeather");

      if (token.startsWith("vibe:")) {
        const vibe = token.split(":")[1]?.toLowerCase();
        return `${t("ui.matches")} ${t(
          `ui.preferences.vibeOptions.${vibe}`
        )}`;
      }

      return token;
    })
    .join(" · ");
}

/* ===========================
   COMPONENTS
=========================== */

function Section({
  title,
  items,
  t
}: {
  title: string;
  items: PlaceCard[];
  t: (k: string, values?: any) => string;
}) {
  if (!items?.length) return null;

  return (
    <section style={{ marginTop: 18 }}>
      <h2 style={{ margin: "0 0 10px 0", fontSize: 16 }}>
        {title}
      </h2>
      <div className="grid">
        {items.map((p) => (
          <Card key={p.place_id} p={p} t={t} />
        ))}
      </div>
    </section>
  );
}

function Card({
  p,
  t
}: {
  p: PlaceCard;
  t: (k: string, values?: any) => string;
}) {
  const reasonText = renderReason(p.reasonTokens, t);

  function formatDistance(km: number) {
    if (km === 0) return t("ui.distanceHere");

    if (km < 1) {
      const meters = Math.round(km * 1000);
      return t("ui.distanceMeters", { value: meters });
    }

    return t("ui.distanceKm", { value: Number(km.toFixed(1)) });
  }

  return (
    <a
      className="card"
      href={p.maps_url}
      target="_blank"
      rel="noreferrer"
      title={t("ui.openGoogleMaps")}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12
        }}
      >
        <div style={{ fontWeight: 650, lineHeight: 1.2 }}>
          {p.name}

          {p.liveVibeIndex !== undefined && (
  <div
    className="vibeRing"
    style={{
      background: `conic-gradient(
        rgba(var(--violet), 0.9) ${p.liveVibeIndex * 3.6}deg,
        rgba(255,255,255,0.08) 0deg
      )`,
      boxShadow:
        p.liveVibeIndex > 75
          ? "0 0 14px rgba(168,132,255,0.6)"
          : p.liveVibeIndex > 45
          ? "0 0 8px rgba(168,132,255,0.35)"
          : "0 0 4px rgba(168,132,255,0.2)",
      animation:
        p.liveVibeIndex > 70
          ? "ringPulse 2s ease-in-out infinite"
          : "none"
    }}
  />
)}
        </div>

        <div
          style={{
            fontSize: 12,
            opacity: 0.7,
            whiteSpace: "nowrap"
          }}
        >
          {p.distance_km !== undefined
            ? formatDistance(p.distance_km)
            : ""}

          {p.score !== undefined
            ? ` · ${t("ui.score")} ${p.score}`
            : ""}
        </div>
      </div>

      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
        {p.rating
          ? `⭐ ${p.rating} (${p.user_ratings_total ?? 0}) · `
          : ""}
        {p.vicinity ?? ""}
      </div>

      {reasonText && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            opacity: 0.75
          }}
        >
          {reasonText}
        </div>
      )}
    </a>
  );
}

/* ===========================
   PAGE
=========================== */

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  const t = await getTranslations();
  const tEn = await getTranslations({ locale: "en" });

  const tt = (key: string, values?: any) => {
    try {
      return t(key, values);
    } catch {
      try {
        return tEn(key, values);
      } catch {
        return key;
      }
    }
  };

  const sp = (await searchParams) ?? {};

  const allCities = getAllCities();
  const cities = allCities.map((c) => ({
    id: c.slug,
    name: `${c.name} · ${c.region}`
  }));

  const citySlug = pickFirst(sp.city);
  const defaultCity = getDefaultCity();
  const selectedCity =
    getCityBySlug(citySlug) ?? defaultCity;

  const audience = pickFirst(sp.audience);
  const vibe = pickFirst(sp.vibe);
  const mobility = pickFirst(sp.mobility);
  const budget = pickFirst(sp.budget);

  const qs = new URLSearchParams();

  qs.set("city", selectedCity.slug);
  qs.set("lat", String(selectedCity.lat));
  qs.set("lng", String(selectedCity.lng));

  if (audience) qs.set("audience", audience);
  if (vibe) qs.set("vibe", vibe);
  if (mobility) qs.set("mobility", mobility);
  if (budget) qs.set("budget", budget);

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const baseUrl = host
    ? `${proto}://${host}`
    : "http://localhost:3000";

  const apiUrl = `${baseUrl}/api/feed?${qs.toString()}`;

  const res = await fetch(apiUrl, { cache: "no-store" });
  const data = (await res.json()) as ApiPayload;

  if (!data?.ok) {
    return (
      <main style={{ padding: 40 }}>
        <h1>API error</h1>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </main>
    );
  }

  const ctx = data.context;
  const hotNow = data.sections?.hotNow ?? data.results ?? [];
  const laterToday = data.sections?.laterToday ?? [];
  const evening = data.sections?.evening ?? [];
  const rainy = data.sections?.rainy ?? [];

  return (
    <>
      <div className="hero">
        <div className="heroOverlay">
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <PreferencesBar
              cities={cities}
              defaultCityId={selectedCity.slug}
            />
          </div>
        </div>
      </div>

      <main className="pageContent">
        <div
          style={{
            fontSize: 12,
            opacity: 0.7,
            marginBottom: 12
          }}
        >
          {ctx
            ? `${new Date(ctx.time).toLocaleString()} · ${
                ctx.weather
              } · ${ctx.radius}m`
            : ""}
        </div>

        <Section
          title={`⚡ ${tt("ui.hotNow")}`}
          items={hotNow}
          t={tt}
        />

        <Section
          title={`🕓 ${tt("ui.goodLaterToday")}`}
          items={laterToday}
          t={tt}
        />

        <Section
          title={`🌙 ${tt("ui.tonightNearby")}`}
          items={evening}
          t={tt}
        />

        <Section
          title={`🌧 ${tt("ui.rainFriendly")}`}
          items={rainy}
          t={tt}
        />
      </main>
    </>
  );
}