import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

// No analytics/ad/font CDN in this app, so almost everything is 'self'.
// `script-src`/`style-src` need 'unsafe-inline' because this is the
// non-nonce CSP variant (see Next's own content-security-policy doc): a
// nonce-based policy needs every page forced into dynamic rendering via
// proxy.ts, which is a bigger structural change than a demo-stage CSP
// warrants right now. This is still a large step up from having no CSP at
// all - it stops any *externally hosted* injected script/exfil target dead,
// which is the more common real-world XSS payload shape. connect-src
// includes the Supabase project host so the browser client (auth, Realtime
// websocket) isn't blocked.
// React itself needs eval() in development only, to reconstruct
// server-side error stacks in the browser (Next's own CSP doc calls this out
// explicitly) - never used in production builds, so this stays dev-only.
const isDev = process.env.NODE_ENV === "development";

// Opt-in, same as AnalyticsProvider: only widen the CSP when PostHog is
// actually configured. PostHog's own docs recommend the `*.posthog.com`
// wildcard rather than pinning exact subdomains (api/assets hosts rotate) -
// https://posthog.com/docs/advanced/content-security-policy. Without this,
// posthog-js's capture/flags calls and session-replay recorder script are
// silently blocked by the browser, not just unconfigured.
const posthogEnabled = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${posthogEnabled ? " https://*.posthog.com" : ""}`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${posthogEnabled ? " https://*.posthog.com" : ""}`,
  `worker-src 'self'${posthogEnabled ? " blob: data:" : ""}`,
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
