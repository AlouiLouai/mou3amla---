export const siteConfig = {
  name: "SQUAD",
  shortName: "SQUAD",
  description: "SQUAD - Tunisia's zero-liability payment routing layer, built on TUNPAY.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  // Keep in sync with the mobile palette in `src/features/squad/constants.ts`.
  themeColor: "#FF0083",
  backgroundColor: "#FFFFFF",
  locale: "en",
  links: {
    source: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
