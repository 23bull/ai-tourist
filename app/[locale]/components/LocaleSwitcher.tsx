"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

type Props = {
  currentLocale: string; // server-fallback (bra vid första render)
};

const LOCALES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "no", label: "Norsk", flag: "🇳🇴" },
  { code: "da", label: "Dansk", flag: "🇩🇰" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "el", label: "Ελληνικά", flag: "🇬🇷" }
] as const;

type LocaleCode = (typeof LOCALES)[number]["code"];

function isLocaleCode(x: string): x is LocaleCode {
  return LOCALES.some((l) => l.code === x);
}

export default function LocaleSwitcher({ currentLocale }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  // Läs aktiv locale från URL (detta gör dropdownen alltid synkad med faktiska routen)
  const parts = pathname.split("/").filter(Boolean);
  const localeFromPath = parts.length > 0 && isLocaleCode(parts[0]) ? parts[0] : null;

  // fallback till server-prop om path inte innehåller locale av någon anledning
  const activeLocale: LocaleCode = (localeFromPath ?? (isLocaleCode(currentLocale) ? currentLocale : "en")) as LocaleCode;

  function onChange(nextLocale: LocaleCode) {
    const nextParts = pathname.split("/").filter(Boolean);

    if (nextParts.length > 0 && isLocaleCode(nextParts[0])) {
      nextParts[0] = nextLocale;
    } else {
      nextParts.unshift(nextLocale);
    }

    const nextPath = "/" + nextParts.join("/");
    const qs = searchParams?.toString();
    router.push(qs ? `${nextPath}?${qs}` : nextPath);
  }

  return (
    <div className="langWrap">
      <label className="langLabel" htmlFor="lang">
        {t("ui.language")}
      </label>

      <select
        id="lang"
        className="langSelect"
        value={activeLocale}
        onChange={(e) => onChange(e.target.value as LocaleCode)}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}