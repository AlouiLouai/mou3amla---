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
    squad/                # The whole product — see docs/README.md. Mounted at "/".
      components/         # Screens (components/screens/*) + shared squad-only bits (bottom-nav)
      hooks/               # use-squad-app.ts — the entire screen/state machine
      constants.ts         # Colors, seed data (providers, wallets)
      types.ts             # Feature-specific types
      mark.tsx             # Brand mark, shared by the src/app/icon* routes
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
  from the file (`@/features/squad/components/screens/home-screen`), matching
  the pattern already used throughout the codebase.
- **No global client-side state library** (Redux/Zustand/Jotai) has been
  introduced. In-memory/UI-flow state (e.g. the `squad` feature's screen
  state machine) is a plain `useReducer` colocated in the feature's `hooks/`
  folder — see `src/features/squad/hooks/use-squad-app.ts`. For state backed
  by a real external, mutable, non-React source (`localStorage`, `navigator`,
  `window.matchMedia`), use `useSyncExternalStore` instead — see
  `src/hooks/use-online-status.ts` and
  [06-conventions.md](./06-conventions.md#client-only-reads-usesyncexternalstore-not-useeffect--setstate).
  Reach for a state library only if the user explicitly asks or a feature
  genuinely can't be built with these.
