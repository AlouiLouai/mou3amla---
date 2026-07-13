# Architecture

This app follows a **feature-sliced** structure: code is organized primarily
by domain/feature, with a small set of shared layers underneath. This scales
better than a flat `components/`, `hooks/`, `utils/` split as the app grows —
new features are additive (a new folder) instead of spreading changes across
several shared folders.

## Folder map

```
src/
  app/                  # App Router routes ONLY — pages, layouts, route handlers,
                         # metadata files (manifest.ts, icon.tsx, sw.ts, proxy build route).
                         # Do not put business logic or reusable components here.

  features/             # Domain feature slices. One folder per feature.
    squad/                # The SHELL — owns shared state/routing, not a domain
                           # of its own. See "The squad shell" below.
      components/         # squad-app.tsx (root composer), home-screen.tsx
                           # (the dashboard — aggregates other features, so it
                           # lives here rather than in one domain feature),
                           # bottom-nav.tsx (shared nav, used by several features)
      hooks/               # use-squad-app.ts — the shared state machine every
                           # screen (in every feature below) reads/dispatches
                           # through via a `squadApp` prop
      constants.ts         # SQUAD's theme tokens ONLY (colors/gradients/shadows)
                           # — no provider/domain data. See src/features/wallets/
                           # constants.ts for that.
      types.ts             # Screen union, AccountId/AccountState/SquadState —
                           # composes types owned by the domain features below
      mark.tsx             # Brand mark, shared by the src/app/icon* routes

    auth/                 # Phone entry + OTP verification
      components/          # auth-screen.tsx, otp-screen.tsx

    onboarding/            # First-run profile creation (username/Mode Pro)
      components/          # profile-setup-screen.tsx

    wallets/               # Linking accounts/providers (never balances)
      components/          # wallet-icon.tsx, wallet-registry-sheet.tsx
      constants.ts         # PROVIDERS, seed wallets — real TUNPAY providers
      types.ts             # RoutingType, Provider, LinkedWallet

    payments/              # Generate/receive/scan/confirm a payment intent
      components/          # generate-intent, receive-qr, scan-qr, intent-result
      lib/                 # deep-link.ts, tunpay.ts, qr-token.ts — pure
                           # helpers with NO React/state
      types.ts             # PaymentIntent, QrToken, ConfettiPiece

    activity/              # The sent/received feed
      components/          # activity-screen.tsx
      types.ts             # ActivityItem

    invoices/              # El Fatoora micro-invoicing (Mode Professionnel)
      components/          # invoices-screen.tsx
      lib/                 # el-fatoora.ts
      types.ts             # Invoice

    profile/               # Profile display + the demo account switcher
      components/          # profile-screen.tsx, account-switcher-sheet.tsx

    <feature>/             # Template for the next feature slice, same shape

  components/            # SHARED, cross-feature UI only
    ui/                   # shadcn/ui primitives — generated, don't hand-edit structure
    layout/               # App shell infra (currently just theme-provider.tsx)
    pwa/                  # PWA-specific shared UI: install prompt, network status toast

  hooks/                 # SHARED hooks used by more than one feature (e.g. use-online-status)

  lib/                   # Small framework-agnostic utilities (e.g. `cn()` in lib/utils.ts)

  server/                # SHARED server-only code not tied to one feature
    actions/              # Server Actions ("use server")

  config/                # App-wide configuration
    site.ts               # Site metadata (name, description, theme color, URL)
    env.ts                 # zod-validated environment variables

  types/                  # SHARED cross-feature types (currently empty — add as needed)

  proxy.ts                # Request interception (see 04-routing-and-proxy.md)
```

## The `squad` shell vs. domain features

`squad` used to hold the entire product as one monolithic feature. It's been
split: `squad` is now just the **shell** — the shared state machine
(`use-squad-app.ts`), the root screen router (`squad-app.tsx`), the shared
theme tokens, and the two pieces of UI genuinely used across multiple
features (`bottom-nav.tsx`, `home-screen.tsx`, since the home dashboard
aggregates wallets/payments/activity rather than belonging to one of them).
Everything domain-specific — auth, onboarding, wallets, payments, activity,
invoices, profile — is its own feature folder.

The state itself is still one shared object (`SquadState`, returned by
`useSquadApp()`), not split into per-feature stores — the screens are too
interdependent (every screen needs to know the active account, for example)
for that to be worth the complexity here. Every screen component receives
the whole `squadApp` object as a prop and reads/dispatches through it. This
is a **file/ownership split**, not a state-isolation split: when adding a
new domain feature, put its screen(s) and pure logic (`lib/`, `types.ts`) in
their own folder, but add the state and actions it needs to
`use-squad-app.ts` in the shell, the same way the existing features do.

## Rule of thumb: where does new code go?

1. **Is it a route (page/layout/route handler)?** → `src/app/**`, following
   Next.js file conventions. Keep these files thin — import logic from
   `features/` or `server/`.
2. **Is it specific to one product feature (squad, auth, billing, etc.)?** →
   `src/features/<feature>/...`. Create the feature folder if it doesn't
   exist. Don't scatter a new feature's components into `src/components/`.
3. **Is it a UI primitive or app-shell piece used by multiple features?** →
   `src/components/{ui,layout,pwa}` as appropriate. Prefer extending an
   existing shadcn primitive over hand-rolling a new one.
4. **Is it a hook used by more than one feature?** → `src/hooks/`. If it's
   only used by one feature, it belongs inside that feature's `hooks/`
   instead — don't promote to shared until there's a second consumer.
5. **Is it server-only logic (Server Action, data access, third-party API
   call with secrets)?** → `src/server/actions/` (shared) or
   `src/features/<feature>/server/` (feature-specific). Never import
   server-only modules from a file that isn't itself server-only or doesn't
   go through the `"use server"` boundary.
6. **Is it configuration/constants read app-wide?** → `src/config/`.

## Explicitly avoid

- **No premature abstraction layer.** Don't add a `services/`, `repositories/`,
  or `store/` folder speculatively — this app has no database or global
  client state manager yet. Add these only when a real feature needs them,
  and prefer colocating inside the feature that needs them first.
- **No barrel files (`index.ts` re-exporting everything)** unless a specific
  feature folder actually grows large enough to need one. Import directly
  from the file (`@/features/payments/components/generate-intent-screen`),
  matching the pattern already used throughout the codebase.
- **No global client-side state library** (Redux/Zustand/Jotai) has been
  introduced. In-memory/UI-flow state for the whole squad shell is a plain
  `useReducer` in `src/features/squad/hooks/use-squad-app.ts` (see "The
  `squad` shell vs. domain features" above for why this stays one shared
  reducer instead of being split per-feature). For state backed
  by a real external, mutable, non-React source (`localStorage`, `navigator`,
  `window.matchMedia`), use `useSyncExternalStore` instead — see
  `src/hooks/use-online-status.ts` and
  [06-conventions.md](./06-conventions.md#client-only-reads-usesyncexternalstore-not-useeffect--setstate).
  Reach for a state library only if the user explicitly asks or a feature
  genuinely can't be built with these.
