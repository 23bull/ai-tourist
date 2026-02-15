"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

type Audience = "general" | "solo" | "couples" | "friends" | "family";
type Vibe = "food" | "culture" | "views" | "nightlife" | "relax";
type Mobility = "walk" | "car" | "boat";
type Budget = "low" | "mid" | "high";

export type CityOption = { id: string; name: string };

type Prefs = {
  city: string;
  audience: Audience;
  vibe: Vibe;
  mobility: Mobility;
  budget: Budget;
};

type Props = {
  cities: CityOption[];
  defaultCityId?: string;
};

const STORAGE_KEY = "ai-tourist:prefs:v2";

function parseEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  if (!value) return fallback;
  const v = value.toLowerCase();
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function safeParsePrefs(raw: string | null): Partial<Prefs> | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Partial<Prefs>;
    return obj ?? null;
  } catch {
    return null;
  }
}

export default function PreferencesBar({ cities, defaultCityId }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  const stableDefaultCity = (defaultCityId ?? cities?.[0]?.id ?? "thessaloniki").trim();

  // Build prefs from URL (source of truth)
  const prefsFromUrl: Prefs = useMemo(() => {
    const sp = searchParams;

    return {
      city: sp.get("city") ?? stableDefaultCity,
      audience: parseEnum<Audience>(sp.get("audience"), ["general", "solo", "couples", "friends", "family"] as const, "general"),
      vibe: parseEnum<Vibe>(sp.get("vibe"), ["food", "culture", "views", "nightlife", "relax"] as const, "culture"),
      mobility: parseEnum<Mobility>(sp.get("mobility"), ["walk", "car", "boat"] as const, "walk"),
      budget: parseEnum<Budget>(sp.get("budget"), ["low", "mid", "high"] as const, "mid")
    };
  }, [searchParams, stableDefaultCity]);

  const [prefs, setPrefs] = useState<Prefs>(prefsFromUrl);

  // Keep local state in sync when URL changes (back/forward etc)
  useEffect(() => {
    setPrefs(prefsFromUrl);
  }, [prefsFromUrl]);

  // First mount: if URL lacks params, seed from localStorage (or defaults) into URL once.
  useEffect(() => {
    const hasAny =
      searchParams.has("city") ||
      searchParams.has("audience") ||
      searchParams.has("vibe") ||
      searchParams.has("mobility") ||
      searchParams.has("budget");

    if (hasAny) return;

    const stored = safeParsePrefs(localStorage.getItem(STORAGE_KEY));

    const initial: Prefs = {
      city: (stored?.city as string) || stableDefaultCity,
      audience: parseEnum<Audience>(stored?.audience as any, ["general", "solo", "couples", "friends", "family"] as const, "general"),
      vibe: parseEnum<Vibe>(stored?.vibe as any, ["food", "culture", "views", "nightlife", "relax"] as const, "culture"),
      mobility: parseEnum<Mobility>(stored?.mobility as any, ["walk", "car", "boat"] as const, "walk"),
      budget: parseEnum<Budget>(stored?.budget as any, ["low", "mid", "high"] as const, "mid")
    };

    const sp = new URLSearchParams(searchParams.toString());
    sp.set("city", initial.city);
    sp.set("audience", initial.audience);
    sp.set("vibe", initial.vibe);
    sp.set("mobility", initial.mobility);
    sp.set("budget", initial.budget);

    router.replace(`${pathname}?${sp.toString()}`);
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When user changes prefs: persist + update URL + refresh server components
  function commit(next: Prefs) {
    // Ensure city is valid if list is present
    const cityOk = !cities.length || cities.some((c) => c.id === next.city);
    const safeNext = cityOk ? next : { ...next, city: stableDefaultCity };

    setPrefs(safeNext);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeNext));

    const sp = new URLSearchParams(searchParams.toString());
    sp.set("city", safeNext.city);
    sp.set("audience", safeNext.audience);
    sp.set("vibe", safeNext.vibe);
    sp.set("mobility", safeNext.mobility);
    sp.set("budget", safeNext.budget);

    router.replace(`${pathname}?${sp.toString()}`);
    router.refresh();
  }

  const cityOptions = cities?.length ? cities : [{ id: stableDefaultCity, name: stableDefaultCity }];

  return (
    <div className="prefsWrap">
      <div className="prefsTitle">{t("ui.preferences.title")}</div>

      <div className="prefsRow">
        <div className="prefsGroup">
          <div className="prefsLabel">{t("ui.preferences.city")}</div>
          <select
            className="prefsSelect"
            value={prefs.city}
            onChange={(e) => commit({ ...prefs, city: e.target.value })}
          >
            {cityOptions.map((c) => (
              <option key={`city-${c.id}`} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="prefsGroup">
          <div className="prefsLabel">{t("ui.preferences.audience")}</div>
          <select
            className="prefsSelect"
            value={prefs.audience}
            onChange={(e) => commit({ ...prefs, audience: e.target.value as Audience })}
          >
            <option value="general">{t("ui.preferences.audienceOptions.general")}</option>
            <option value="solo">{t("ui.preferences.audienceOptions.solo")}</option>
            <option value="couples">{t("ui.preferences.audienceOptions.couples")}</option>
            <option value="friends">{t("ui.preferences.audienceOptions.friends")}</option>
            <option value="family">{t("ui.preferences.audienceOptions.family")}</option>
          </select>
        </div>

        <div className="prefsGroup">
          <div className="prefsLabel">{t("ui.preferences.vibe")}</div>
          <select
            className="prefsSelect"
            value={prefs.vibe}
            onChange={(e) => commit({ ...prefs, vibe: e.target.value as Vibe })}
          >
            <option value="food">{t("ui.preferences.vibeOptions.food")}</option>
            <option value="culture">{t("ui.preferences.vibeOptions.culture")}</option>
            <option value="views">{t("ui.preferences.vibeOptions.views")}</option>
            <option value="nightlife">{t("ui.preferences.vibeOptions.nightlife")}</option>
            <option value="relax">{t("ui.preferences.vibeOptions.relax")}</option>
          </select>
        </div>

        <div className="prefsGroup">
          <div className="prefsLabel">{t("ui.preferences.mobility")}</div>
          <select
            className="prefsSelect"
            value={prefs.mobility}
            onChange={(e) => commit({ ...prefs, mobility: e.target.value as Mobility })}
          >
            <option value="walk">{t("ui.preferences.mobilityOptions.walk")}</option>
            <option value="car">{t("ui.preferences.mobilityOptions.car")}</option>
            <option value="boat">{t("ui.preferences.mobilityOptions.boat")}</option>
          </select>
        </div>

        <div className="prefsGroup">
          <div className="prefsLabel">{t("ui.preferences.budget")}</div>
          <select
            className="prefsSelect"
            value={prefs.budget}
            onChange={(e) => commit({ ...prefs, budget: e.target.value as Budget })}
          >
            <option value="low">{t("ui.preferences.budgetOptions.low")}</option>
            <option value="mid">{t("ui.preferences.budgetOptions.mid")}</option>
            <option value="high">{t("ui.preferences.budgetOptions.high")}</option>
          </select>
        </div>
      </div>

      <div className="prefsHint">{t("ui.preferences.hint")}</div>
    </div>
  );
}