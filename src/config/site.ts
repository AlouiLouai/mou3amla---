import { env } from "@/config/env";

export const siteConfig = {
  name: "Mou3amla",
  shortName: "Mou3amla",
  description: "Mou3amla - Tunisia's zero-liability payment routing layer, built on TUNPAY.",
  url: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  // Keep in sync with the mobile palette in `src/features/mou3amla/constants.ts`.
  themeColor: "#FF0083",
  backgroundColor: "#FFFFFF",
  locale: "en",
  links: {
    source: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
