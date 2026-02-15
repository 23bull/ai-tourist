import {getRequestConfig} from "next-intl/server";

const locales = ["en", "sv", "no", "da", "de", "el"] as const;
type AppLocale = (typeof locales)[number];

const defaultLocale: AppLocale = "en";

function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export default getRequestConfig(async ({requestLocale}) => {
  const requested = await requestLocale;

  const locale: AppLocale = isAppLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});