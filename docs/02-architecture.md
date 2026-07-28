# Architecture

This app follows a **feature-sliced** structure: business logic lives by
domain, while route files stay thin and mostly compose server helpers and
feature UI.

## Folder map

```text
src/
  app/                    # App Router routes only: pages, layouts, route handlers,
                           # metadata files, service worker route, proxy-adjacent routes
    page.tsx              # Stage 1 auth landing: phone + username
    verify/page.tsx       # Stage 2 passkey (WebAuthn) gate
    home/page.tsx         # Stage 3 authenticated dashboard
    dev/mock-checkout/    # Internal Mou3amla-branded payment demo route
    payments/return/      # Provider redirect landing pages (Flouci/Konnect)
    verify-identity/      # Identity verification entry (demo KYC flow only, see conventions)
    api/qr/               # Signed QR mint + recipient resolve
    api/nearby/           # Nearby 5-digit handoff publish/options/claim
    api/payments/providers/# Provider webhooks / payment finalization callbacks
    auth/logout/route.ts  # Session teardown

  features/
    mou3amla/                # Authenticated shell: screen router, shared reducer,
                           # dashboard, bottom nav, shell-level theme tokens
      components/         # includes shell primitives like screen-frame.tsx,
                           # plus home-screen.tsx and contacts-screen.tsx (the
                           # "quick send" full-list screen, derived from the
                           # activity log - not a real contacts table)
      hooks/
      constants.ts
      types.ts
      mark.tsx            # OG-image icon generator source, not the in-app logo
      logo-lockup.tsx      # the actual "m" + wordmark shown on splash/auth

    auth/                 # Stage 1 + Stage 2 auth UX and server logic
      components/         # auth-screen.tsx, verify-flow.tsx, profile-builder-screen.tsx,
                           # passkey-screen.tsx, onboarding-stepper.tsx,
                           # proximity-sandbox-preview.tsx, identity-card-preview.tsx
      lib/                # phone/username normalization and zod schemas
      server/             # server actions + authenticated-user DAL
      types.ts

    onboarding/           # Post-login identity verification UX
      components/         # verification-flow-screen.tsx, demo-verification-panel.tsx
      hooks/               # use-demo-verification.ts
      server/             # actions.ts - runDemoVerification + audit logging (no real provider wired up yet)

    wallets/              # Destination linking only; never balances
      components/
      constants.ts
      types.ts

    payments/             # Intent generation, QR request/scan, result UX
      components/
      hooks/              # useRecipientSearch, useQrCameraScanner - feature-specific, not shared
      lib/
      server/
      types.ts

    activity/
    notifications/
    invoices/
    profile/

  components/             # Shared cross-feature UI only
    ui/                   # shadcn primitives, plus hand-rolled (not
                           # shadcn-generated) shared widgets used by more
                           # than one feature:
                           #   - bottom-sheet.tsx: shared shell for every
                           #     bottom sheet (backdrop + card + pointer-
                           #     driven draggable grabber, real swipe-to-
                           #     dismiss). LanguageSheet, InfoSheet, and
                           #     WalletRegistrySheet all wrap this instead of
                           #     each hand-rolling the same fixed-position
                           #     markup.
                           #   - empty-state.tsx: the icon-badge "nothing
                           #     here yet" pattern (icon + title + muted body
                           #     + optional CTA), used by activity, contacts,
                           #     accounts, invoices, notifications, wallets,
                           #     and recipient search's zero-results state.
                           #   - nearby-radar.tsx: the sweeping-ring "who's
                           #     nearby" visual shared by the pre-signup
                           #     ProximitySandboxPreview (fake data) and the
                           #     real receive/scan nearby screens (real
                           #     codes as blips) - one shared component so
                           #     the pre-auth teaser and the real feature
                           #     actually look like the same feature.
    layout/               # theme-provider and layout helpers
    pwa/                  # install prompt, update-available prompt, online-state
                           # shared UI, splash screen
    analytics/            # analytics-provider.tsx - optional PostHog wiring,
                           # a no-op with zero network calls when
                           # NEXT_PUBLIC_POSTHOG_KEY is unset

  hooks/                  # Shared hooks used across features - only put a hook
                           # here if it has zero feature-specific coupling
                           # (use-online-status.ts, use-has-mounted.ts, use-now.ts).
                           # Anything tied to one feature's domain logic belongs in
                           # that feature's own hooks/, not here.
  lib/
    supabase/             # SSR, admin, and proxy Supabase clients
    utils.ts

  config/
    site.ts
    env.ts

  proxy.ts                # Request interception + Supabase session refresh

supabase/
  migrations/             # Source-controlled database schema changes
```

## Auth and KYC ownership

- **Stage 1 landing** belongs to `src/app/page.tsx` plus
  `src/features/auth/components/auth-screen.tsx` and
  `src/features/auth/server/actions.ts`.
- **Stage 2 passkey gate** belongs to `src/app/verify/page.tsx` plus
  `src/features/auth/components/passkey-screen.tsx`. For a brand-new
  identity (`mode === "register"`), `/verify/page.tsx` actually renders
  `VerifyFlow` (`verify-flow.tsx`), a small client component that inserts one
  extra beat - `ProfileBuilderScreen` (claim-confirmation + a cyan/magenta
  personal card-style pick, persisted via `setProfileCardGradient` in
  `auth/server/actions.ts`) - before handing off to `PasskeyScreen`. This is
  still the same single `/verify` route and still single-entry auth (see
  "Auth conventions" in [06-conventions.md](./06-conventions.md)) - it is a
  client-side step inside the register branch, not a second screen type. A
  returning identity (`mode === "authenticate"`) skips straight to
  `PasskeyScreen`, unchanged. `onboarding-stepper.tsx` (a 3-step "Device
  Connected / Build Profile / Secure Passkey" progress bar, pinned to 33% the
  instant it renders) appears on `auth-screen.tsx` always and on
  `passkey-screen.tsx` only in register mode.
  `proximity-sandbox-preview.tsx` is an expandable, entirely-fake nearby-radar
  teaser on `auth-screen.tsx` shown before any signup step - it never calls
  `/api/nearby/**` (which requires a session).
- **Authenticated user lookup** belongs to
  `src/features/auth/server/dal.ts`, not inside pages.
- **Supabase client setup** belongs to `src/lib/supabase/**`.
- **Identity verification** belongs to the `onboarding` feature
  (`verification-flow-screen.tsx`, `demo-verification-panel.tsx`) for UI and
  `src/features/onboarding/server/actions.ts` for the (currently simulated)
  status update and Supabase sync. No real eKYC provider is wired up - see
  [06-conventions.md](./06-conventions.md#kyc-conventions).
- **Signed QR and nearby discovery** belong to the `payments` feature for UI
  and helpers, with thin route handlers under `src/app/api/qr/**` and
  `src/app/api/nearby/**`. The nearby flow is a mutual-accept, AirDrop-style
  alternative to QR (not real BLE - see
  [07-agent-guardrails.md](./07-agent-guardrails.md)): both the payer and the
  recipient must independently accept a shared 5-digit code before the
  recipient is revealed. The recipient can optionally attach an amount when
  publishing (`nearby_handoffs.amount`, blank = "open") - shown early to the
  payer once matched, but never a second required input, since the payer
  still enters the actual amount on `generate-intent-screen.tsx` regardless.
  Shared lookup/response-shaping logic for that handshake lives in
  `src/features/payments/server/nearby-match.ts`, polled from the client via
  `/api/nearby/status`. A claimed-but-unconfirmed handoff gets a bounded
  acceptance window (`NEARBY_HANDSHAKE_TTL_MS` in
  `src/features/payments/constants.ts`) set once at claim time - the owner's
  background QR/code republish must never slide that expiry forward, or an
  abandoned handshake would block that owner's code slot indefinitely.
  `/api/nearby/cancel` lets either side bail out before that window elapses:
  as owner it deletes the handoff outright, as payer it releases the claim
  back to `published` without touching the owner's row. "Nearby" is bounded by
  a coarse, rounded geolocation (`src/features/payments/lib/geolocation.ts`,
  ~100m precision, never the raw device coordinates) rather than real
  proximity detection - `/api/nearby/options` and `/api/nearby/claim` bound
  results to a small bounding box around the requester's coordinates when
  shared, and fall back to the unfiltered recent-published pool if location
  permission was declined (demo-friendly, but no longer a physical-proximity
  guarantee for that user).
- **Recipient username search-as-you-type** on the send screen calls
  `/api/users/search` (an admin-client query, since RLS only lets a user read
  their own `profiles` row) and is debounced client-side in
  `generate-intent-screen.tsx`.

## The `mou3amla` shell vs. domain features

`mou3amla` is the authenticated app shell, not the auth system itself. It owns
the home/dashboard experience, the shared screen reducer for client
interaction state, and shared shell chrome such as the bottom nav. Auth,
wallets, notifications, profile, invoices, and payments still keep their own
domain code in their feature folders.

The shell now uses a reusable frame pattern: header and footer/tab chrome
stay pinned to the top/bottom of the shell - they never scroll away or get
covered - while each screen's central content pane is the only scrollable
region. That shared behavior belongs in
`src/features/mou3amla/components/screen-frame.tsx` instead of being
reimplemented ad hoc per screen. Pinned is not the same as static: the bottom
nav does visually react to that scroll (see below) without ever leaving its
fixed position or being scrolled offscreen.

`ScreenFrame` also exposes scroll direction via a small context
(`useScrollCompact`, exported from `screen-frame.tsx`) so the footer it
renders can react to it without prop-drilling through every screen's
`renderAppFooter(...)` call site - the footer node is built by each screen
before being handed to `ScreenFrame` as a plain prop, so `ScreenFrame` is the
only place that actually sees the scroll events. `BottomNav`
(`bottom-nav.tsx`) is the one consumer today: it shrinks its tab icons/
padding on scroll-down and restores them on scroll-up or near the top,
Instagram-style. This is a visual response to scrolling, not the frame
structure moving - the nav's position never changes.

Every full-page screen in the authenticated shell (home, send, receive, scan,
intent result, activity, invoices, profile, notifications) shares the exact
same header and bottom nav - not just the four screens the bottom nav can
navigate directly to. This is a deliberate tab-app IA: there is no per-screen
back-chevron header, and "back" is just tapping Home. Screens must not build
their own header; use `src/features/mou3amla/components/app-header.tsx`
(`AppHeader`) and `renderAppFooter` from
`src/features/mou3amla/components/bottom-nav.tsx` instead. Screen-specific
context (a title, a subtitle) belongs as the first thing in the *scrollable
body*, not in the fixed header. `ScreenFrame`'s `footer` prop is a plain
`ReactNode` rendered `absolute` at the bottom of the shell; it never hides or
leaves that position, though (per above) `BottomNav` specifically does resize
its own contents in response to scroll direction. Sheets/overlays like
`WalletRegistrySheet` are not full-page screens and stay exempt from this
pattern.

`AppHeader` takes an optional `onBack` prop that swaps the avatar/greeting
block for a back-chevron (still wired to `actions.goHome`, not a real
navigation stack) - used on the send (`generate-intent-screen.tsx`) and
activity screens, where a chevron reads clearer than a greeting on a
mid-task screen. Every other screen omits `onBack` and keeps the
avatar/greeting default; don't spread the chevron to screens reachable
directly from the bottom nav.

The shell now bootstraps its real user state from Supabase-backed server data:
profile, linked destinations, activity history, and notifications are passed
through `initialUser`. Only transient UI state stays in the reducer.

To keep the first mobile load lighter, non-home shell screens are lazy-loaded
from `src/features/mou3amla/components/mou3amla-app.tsx` with `next/dynamic`.

## Rule of thumb: where does new code go?

1. **Is it a route, page, layout, or route handler?** Put it under
   `src/app/**`.
2. **Is it specific to one domain?** Put it under `src/features/<feature>/`.
3. **Is it shared UI across multiple features?** Put it under
   `src/components/**`.
4. **Is it server-only logic with secrets, auth, or third-party API calls?**
   Put it in `src/features/<feature>/server/` or another server-only module.
5. **Is it Supabase plumbing?** Prefer `src/lib/supabase/**` unless it's
   feature-specific query logic.
6. **Is it schema or persistent database structure?** Add a migration under
   `supabase/migrations/**`.

## Explicitly avoid

- **No speculative `services/`, `repositories/`, or state-library layers.**
  Colocate logic until a real pain point appears.
- **No barrel files by default.** Import directly from concrete files.
- **No direct `process.env` reads throughout the app.** Go through
  `src/config/env.ts`.
- **No business logic inside route files.** Pages and handlers should stay
  orchestration-thin and delegate to feature/server helpers.
