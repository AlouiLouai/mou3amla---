import { env } from "@/config/env";

export const siteConfig = {
  name: "Mou3amla",
  shortName: "Mou3amla",
  description: "Mou3amla - Tunisia's zero-liability payment routing layer, built on TUNPAY.",
  url: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  // Drives both the browser's viewport theme-color meta tag and the
  // manifest's theme_color (the installed/standalone PWA's Android status
  // bar + task-switcher card background). Matches `backgroundColor` below
  // (mou3amla.bg dark, the app's default background - the pre-auth shell is
  // always forced dark regardless of the in-app toggle, see
  // auth-screen.tsx) rather than the accent blue this used to be set to -
  // that mismatch was barely visible as a thin address-bar tint in a
  // browser tab, but reads as a jarring solid blue bar sitting directly
  // above an otherwise all-black app once installed standalone, where
  // there's no browser chrome to buffer the difference (2026-07-25 fix).
  themeColor: "#000000",
  backgroundColor: "#000000",
  locale: "en",
  links: {
    source: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
