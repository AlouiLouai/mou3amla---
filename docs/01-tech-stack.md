# Tech Stack

This is a **Next.js 16 App Router** PWA. Next.js 16 is recent enough that
generic training knowledge about "Next.js" is often wrong for this repo, so
check the local docs under `node_modules/next/dist/docs/` before assuming an
older pattern still applies.

## Core

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16.2 (App Router) | **Turbopack is the default bundler** for both `next dev` and `next build`. Do not add webpack-specific config expecting it to run. |
| Package manager | **pnpm** | Never use `npm install` or `yarn add`. Keep one lockfile. |
| Language | TypeScript, strict mode | `tsconfig.json` intentionally includes `"webworker"` alongside `"dom"` so `src/app/sw.ts` continues to type-check. |
| UI library | React 19 | Server Components by default; add `"use client"` only where hooks/browser APIs are required. |
| Styling | Tailwind CSS v4 | Theme config lives in `src/app/globals.css` via `@theme inline`, not in a JS Tailwind config file. |
| Components | shadcn/ui (`radix` base, `nova` preset) | Use the CLI for new primitives; generated components rely on repo-specific CSS variables and tokens. |
| Theming | `next-themes` | Theme stays forced **dark** for the current black, Instagram-derived mobile UI (blue/purple/red gradient accents) - see [05-styling-ui.md](./05-styling-ui.md#theming). |
| Validation | `zod` v4 | Used for env validation and auth input parsing. |
| Auth/session | Supabase Auth (session only) + self-hosted WebAuthn | Phone-first landing UX; verification is a passkey (WebAuthn) ceremony implemented with `@simplewebauthn/server` + `@simplewebauthn/browser`, storing credentials in `public.passkeys` — **not** Supabase's native `auth.experimental.passkey`, whose experimental verify endpoint reliably rejected valid credentials (see [06-conventions.md](./06-conventions.md#auth-conventions)). Supabase Auth still issues the actual session (via a magic-link handshake), and session refresh happens in `src/proxy.ts`. No OTP, no password. |
| Database | Supabase Postgres | User identity lives in `public.profiles`; linked destinations, payment transactions, and notifications live in Supabase too. Schema changes belong in `supabase/migrations/**`. |
| QR routing | Server-minted signed tokens | Rotating receive QR codes are minted server-side and HMAC-signed before `/api/qr/resolve` exposes recipient routing data. |
| Nearby handoff | Mutual-accept 3-digit code (AirDrop-style) | A choice alongside QR, not a replacement (`HandoffModeToggle`). A payer proposes a match on the recipient's published code (`/api/nearby/claim`), then both sides must independently accept (`/api/nearby/accept`) before `/api/nearby/status` reveals the recipient. Match/accept/cancel state now arrives live over Supabase Realtime on `public.nearby_handoffs`; `navigator.vibrate` fires on match/confirm where supported (not iOS Safari). Still a simulation, not real BLE (guardrail #11). |
| Recipient search | Admin-client typeahead | `/api/users/search` powers debounced username search on the send screen; needed because RLS on `profiles` only allows reading your own row. |
| Identity verification | Simulated demo (no provider wired up) | KYC lives under `src/app/verify-identity/**` plus `src/features/onboarding/**`. `runDemoVerification` (a server action) sets `verification_status = "verified"` and `kyc_provider_status = "Demo Approved"` on `public.profiles`, logging every transition to `public.verification_events` for audit. No real eKYC provider is integrated yet - see [06-conventions.md](./06-conventions.md#kyc-conventions) for what to do when one is chosen. |
| Live notifications | Supabase Realtime (Postgres Changes) + polling fallback | `useRealtimeNotifications` subscribes to INSERT events on `public.notifications`, enabled via `alter publication supabase_realtime add table public.notifications`. RLS-scoped automatically. A short polling fallback also queries recent notifications so the receiver-side Activity jump still happens if a browser misses the websocket insert during a live demo. |
| Toasts | `sonner` | Wired through the shadcn wrapper in `src/components/ui/sonner.tsx`. |
| Offline / installability | `@serwist/turbopack` + `serwist` | **Not** `next-pwa`, and **not** `@serwist/next` (webpack-based). |
| Request interception | `proxy.ts` | **Not** `middleware.ts`. Next.js 16 renamed the file convention. |

## Version-sensitive facts an agent is likely to get wrong

- **Turbopack is default**, not opt-in. The scripts pass `--turbopack`
  explicitly, but the project is not maintaining a webpack fallback path.
- **`middleware.ts` does not belong here.** The file is `src/proxy.ts`,
  exporting `proxy(request)`.
- **shadcn's CLI is the current `shadcn` package**, not the older
  `shadcn-ui` package name. Use `pnpm dlx shadcn@latest add <component>`.
- **Serwist must stay on the Turbopack-native integration.** Do not swap in
  webpack-only PWA packages to "fix" build or service worker issues.
- **`app/manifest.ts` is served at `/manifest.webmanifest`**, not
  `/manifest.json`.
- **Manifest icons are generated route handlers**, not static PNG files under
  `public/`.
- **Supabase env access is centralized.** Import `env` from
  `src/config/env.ts`; do not read `process.env` directly throughout the app.
