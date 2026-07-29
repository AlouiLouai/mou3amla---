import { env } from "@/config/env";

export const siteConfig = {
  name: "Mou3amla",
  shortName: "Mou3amla",
  description: "Mou3amla - Tunisia's zero-liability payment routing layer, built on TUNPAY.",
  url: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  // Drives the browser theme-color meta tag and the manifest's theme_color
  // (installed PWA's Android status bar) - matches backgroundColor below,
  // not the accent blue, which read as a jarring bar once installed standalone.
  themeColor: "#000000",
  backgroundColor: "#000000",
  locale: "en",
  links: {
    source: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
