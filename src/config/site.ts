export const siteConfig = {
  name: "SQUAD",
  shortName: "SQUAD",
  description: "SQUAD — Tunisia's P2P social ledger. Send and receive money instantly.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  // Keep in sync with `squad.bg` in src/features/squad/constants.ts — the app
  // is a fixed-dark experience, so these double as the PWA chrome colors.
  themeColor: "#08090A",
  backgroundColor: "#08090A",
  locale: "en",
  links: {
    source: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
