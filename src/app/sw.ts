import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // `injectionPoint` matches the default used by `createSerwistRoute`.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Signed QR/nearby-handoff data is short-lived and payment-sensitive: never let
// the SW serve a stale cached response for these on a flaky connection.
const paymentApiRoutes: RuntimeCaching[] = [
  {
    matcher({ url }) {
      return url.pathname.startsWith("/api/qr/") || url.pathname.startsWith("/api/nearby/");
    },
    handler: new NetworkOnly(),
  },
];

// `defaultCache`'s NetworkFirst HTML caching could serve a previous user's
// cached authenticated page on a shared device - these stay NetworkOnly instead.
const authenticatedPageRoutes: RuntimeCaching[] = [
  {
    matcher({ url }) {
      return url.pathname === "/home" || url.pathname === "/verify" || url.pathname === "/verify-identity";
    },
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Deliberately not `skipWaiting: true` - a new worker waits until the
  // client posts `{ type: "SKIP_WAITING" }`, which UpdatePrompt sends once
  // the user consents (src/components/pwa/update-prompt.tsx).
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...paymentApiRoutes, ...authenticatedPageRoutes, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
