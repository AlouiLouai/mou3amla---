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

// `defaultCache` caches same-origin HTML navigations with NetworkFirst (24h
// TTL) - fine for public pages, but on a shared/handed-off device it can
// serve a previous user's cached authenticated HTML if the next user
// navigates here while offline. `/home` renders the entire authenticated
// dashboard (every screen is client-side state under this one route), and
// `/verify`/`/verify-identity` carry a live session too, so all of them stay
// NetworkOnly rather than falling back to a stale cross-user cache entry.
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
  skipWaiting: true,
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
