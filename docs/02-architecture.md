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
    verify/page.tsx       # Stage 2 OTP gate
    home/page.tsx         # Stage 3 authenticated dashboard
    verify-identity/      # Local mock identity verification screens
    api/qr/               # Signed QR mint + recipient resolve
    api/nearby/           # Nearby 3-digit handoff publish/options/claim
    auth/logout/route.ts  # Session teardown

  features/
    squad/                # Authenticated shell: screen router, shared reducer,
                           # dashboard, bottom nav, shell-level theme tokens
      components/         # includes shell primitives like screen-frame.tsx
      hooks/
      constants.ts
      types.ts
      mark.tsx

    auth/                 # Stage 1 + Stage 2 auth UX and server logic
      components/         # auth-screen.tsx, otp-screen.tsx
      lib/                # phone/username normalization and zod schemas
      server/             # server actions + authenticated-user DAL
      types.ts

    onboarding/           # Post-login identity verification UX
      components/         # verification-flow-screen.tsx
      server/             # mock verification status actions

    wallets/              # Destination linking only; never balances
      components/
      constants.ts
      types.ts

    payments/             # Intent generation, QR request/scan, result UX
      components/
      lib/
      server/
      types.ts

    activity/
    notifications/
    invoices/
    profile/

  components/             # Shared cross-feature UI only
    ui/                   # shadcn primitives
    layout/               # theme-provider and layout helpers
    pwa/                  # install prompt / online-state shared UI

  hooks/                  # Shared hooks used across features
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
- **Stage 2 OTP** belongs to `src/app/verify/page.tsx` plus
  `src/features/auth/components/otp-screen.tsx`.
- **Authenticated user lookup** belongs to
  `src/features/auth/server/dal.ts`, not inside pages.
- **Supabase client setup** belongs to `src/lib/supabase/**`.
- **Mock identity verification** belongs to the `onboarding` feature for UI
  and `src/features/onboarding/server/**` for Supabase status updates.
- **Signed QR and nearby discovery** belong to the `payments` feature for UI
  and helpers, with thin route handlers under `src/app/api/qr/**` and
  `src/app/api/nearby/**`. The nearby flow is a mutual-accept, AirDrop-style
  alternative to QR (not real BLE - see
  [07-agent-guardrails.md](./07-agent-guardrails.md)): both the payer and the
  recipient must independently accept a shared 3-digit code before the
  recipient is revealed. Shared lookup/response-shaping logic for that
  handshake lives in `src/features/payments/server/nearby-match.ts`, polled
  from the client via `/api/nearby/status`.
- **Recipient username search-as-you-type** on the send screen calls
  `/api/users/search` (an admin-client query, since RLS only lets a user read
  their own `profiles` row) and is debounced client-side in
  `generate-intent-screen.tsx`.

## The `squad` shell vs. domain features

`squad` is the authenticated app shell, not the auth system itself. It owns
the home/dashboard experience, the shared screen reducer for client
interaction state, and shared shell chrome such as the bottom nav. Auth,
wallets, notifications, profile, invoices, and payments still keep their own
domain code in their feature folders.

The shell now uses a reusable frame pattern: header and footer/tab chrome stay
fixed, while each screen's central content pane is the only scrollable region.
That shared behavior belongs in `src/features/squad/components/screen-frame.tsx`
instead of being reimplemented ad hoc per screen.

The shell now bootstraps its real user state from Supabase-backed server data:
profile, linked destinations, activity history, and notifications are passed
through `initialUser`. Only transient UI state stays in the reducer.

To keep the first mobile load lighter, non-home shell screens are lazy-loaded
from `src/features/squad/components/squad-app.tsx` with `next/dynamic`.

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
