export const siteConfig = {
  name: "SQUAD",
  shortName: "SQUAD",
  description: "SQUAD — Tunisia's zero-liability payment routing layer, built on TUNPAY.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  // Keep in sync with `squad.bg` in src/features/squad/constants.ts — the app
  // is a fixed-dark experience, so these double as the PWA chrome colors.
  themeColor: "#000000",
  backgroundColor: "#000000",
  locale: "en",
  links: {
    source: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
