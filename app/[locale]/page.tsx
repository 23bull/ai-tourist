import {getAllCities, getCityBySlug, getDefaultCity} from "../../lib/greece-cities";
import {getTranslations} from "next-intl/server";
import {headers} from "next/headers";

import LightningIcon from "./components/LightningIcon";
import PreferencesBar from "./components/PreferencesBar";

type PlaceCard = {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  vicinity?: string;
  maps_url: string;
  distance_km?: number;
  score?: number;
  reason?: string;
};

type ApiPayload = {
  ok: boolean;
  status?: string;
  error?: string;
  context?: {
    time: string;
    weather: string;
    radius: number;
    location: {lat: number; lng: number};
    prefs?: {
      city?: string;
      audience?: string;
      vibe?: string;
      mobility?: string;
      budget?: string;
    };
  };
  sections?: {
    hotNow: PlaceCard[];
    laterToday: PlaceCard[];
    evening: PlaceCard[];
    rainy: PlaceCard[];
  };
  results?: PlaceCard[];
};

function Card({p, t}: {p: PlaceCard; t: (k: string) => string}) {
  return (
    <a className="card" href={p.maps_url} target="_blank" rel="noreferrer" title={t("ui.openGoogleMaps")}>
      <div style={{display: "flex", justifyContent: "space-between", gap: 12}}>
        <div style={{fontWeight: 650, lineHeight: 1.2}}>{p.name}</div>
        <div style={{fontSize: 12, opacity: 0.7, whiteSpace: "nowrap"}}>
          {p.distance_km !== undefined ? `${p.distance_km} km` : ""}
          {p.score !== undefined ? ` · ${t("ui.score")} ${p.score}` : ""}
        </div>
      </div>

      <div style={{marginTop: 6, fontSize: 13, opacity: 0.8, lineHeight: 1.3}}>
        {p.rating ? `⭐ ${p.rating} (${p.user_ratings_total ?? 0}) · ` : ""}
        {p.vicinity ?? ""}
      </div>

      {p.reason ? <div style={{marginTop: 6, fontSize: 12, opacity: 0.75}}>{p.reason}</div> : null}
    </a>
  );
}

function Section({
  title,
  items,
  t
}: {
  title: string;
  items: PlaceCard[];
  t: (k: string) => string;
}) {
  if (!items?.length) return null;

  return (
    <section style={{marginTop: 18}}>
      <h2 style={{margin: "0 0 10px 0", fontSize: 16}}>{title}</h2>
      <div className="grid">
        {items.map((p) => (
          <Card key={p.place_id} p={p} t={t} />
        ))}
      </div>
    </section>
  );
}

function pickFirst(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Translations
  const t = await getTranslations();
  const tEn = await getTranslations({ locale: "en" });

  const tt = (key: string) => {
    try {
      return t(key);
    } catch {
      try {
        return tEn(key);
      } catch {
        return key;
      }
    }
  };

  const sp = (await searchParams) ?? {};

  // ---- Cities (for UI dropdown) ----
  const allCities = getAllCities();
  const cities = allCities.map((c) => ({
    id: c.slug,
    name: `${c.name} · ${c.region}`
  }));

  // City from URL
  const citySlug = pickFirst(sp.city);
  const defaultCity = getDefaultCity();
  const selectedCity = getCityBySlug(citySlug) ?? defaultCity;

  // Preferences from URL
  const audience = pickFirst(sp.audience);
  const vibe = pickFirst(sp.vibe);
  const mobility = pickFirst(sp.mobility);
  const budget = pickFirst(sp.budget);

  // Querystring to API (whitelist)
  const qs = new URLSearchParams();

  // Include city slug (useful to debug + future-proof)
  qs.set("city", selectedCity.slug);

  // Always set lat/lng from selected city (feed använder lat/lng)
  qs.set("lat", String(selectedCity.lat));
  qs.set("lng", String(selectedCity.lng));

  if (audience) qs.set("audience", audience);
  if (vibe) qs.set("vibe", vibe);
  if (mobility) qs.set("mobility", mobility);
  if (budget) qs.set("budget", budget);

  // Base URL
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const baseUrl = host ? `${proto}://${host}` : "http://localhost:3000";

  const apiUrl = `${baseUrl}/api/feed?${qs.toString()}`;

  const res = await fetch(apiUrl, {cache: "no-store"});
  const data = (await res.json()) as ApiPayload;

  if (data?.ok) {
    const ctx = data.context;
    const hotNow = data.sections?.hotNow ?? data.results ?? [];
    const laterToday = data.sections?.laterToday ?? [];
    const evening = data.sections?.evening ?? [];
    const rainy = data.sections?.rainy ?? [];
    const hottest = hotNow?.[0];
  
    return (
      <>
        {/* HERO */}
<div className="hero">
  <div className="heroOverlay">
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap"
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <PreferencesBar
            cities={cities}
            defaultCityId={selectedCity.slug}
          />
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <p className="heroSubtitle">
          Personalised recommendations based on your mood, weather and time of day.
        </p>
      </div>

    </div>
  </div>
</div>
        <main className="pageContent">
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
            {ctx
              ? `${new Date(ctx.time).toLocaleString()} · ${ctx.weather} · ${ctx.radius}m`
              : ""}
          </div>
  
          {hottest ? (
            <div className="heroWrap">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12
                }}
              >
                <h2 className="hotTitle">
                  <span className="bolt">
                    <LightningIcon />
                  </span>
                  {tt("ui.hotNow")}
                </h2>
  
                <div className="subtle" style={{ fontSize: 12 }}>
                  {tt("ui.hotHint")}
                </div>
              </div>
  
              <div className="heroCard">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "baseline"
                  }}
                >
                  <div className="heroBadge">{tt("ui.trendingNow")}</div>
                  <a
                    href={hottest.maps_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, opacity: 0.75 }}
                  >
                    {tt("ui.viewInMaps")} →
                  </a>
                </div>
  
                <h3 className="heroTitle" style={{ marginTop: 10 }}>
                  {hottest.name}
                </h3>
  
                <div className="heroMeta muted">
                  <div>
                    {hottest.rating
                      ? `⭐ ${hottest.rating} (${hottest.user_ratings_total ?? 0})`
                      : `⭐ ${tt("ui.popular")}`}{" "}
                    {hottest.distance_km !== undefined
                      ? `· ${hottest.distance_km} km`
                      : ""}{" "}
                    {hottest.score !== undefined
                      ? `· ${tt("ui.score")} ${hottest.score}`
                      : ""}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    {(hottest.reason ?? tt("ui.perfectNow"))} ·{" "}
                    {hottest.vicinity ?? ""}
                  </div>
                </div>
  
                <div className="heroCTArow">
                  <a
                    className="pill pillPrimary"
                    href={hottest.maps_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {tt("ui.openInMaps")}
                  </a>
                  <a
                    className="pill"
                    href={`${hottest.maps_url}&travelmode=walking`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {tt("ui.navigate")}
                  </a>
                </div>
              </div>
            </div>
          ) : null}
  
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
  
  return (
    <main style={{ padding: 40 }}>
      <h1>API error</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}