import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["en", "sv", "no", "da", "de", "el"],
  defaultLocale: "en",
  localePrefix: "always"
});

export const config = {
  matcher: ["/", "/(en|sv|no|da|de|el)/:path*"]
};