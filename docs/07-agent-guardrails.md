# Agent Guardrails

Read this before making changes. It's the condensed list of things training
data gets wrong about this specific stack, plus hard rules to keep the app's
structure from drifting.

## Hard rules

1. **Use pnpm.** Never `npm install`, `npm run`, `yarn add`, etc.
2. **Never create `middleware.ts`.** This app uses `src/proxy.ts`
   (`export function proxy(request)`), Next.js 16's renamed convention. See
   [04-routing-and-proxy.md](./04-routing-and-proxy.md).
3. **Never add webpack config expecting it to run.** Turbopack is the only
   bundler wired up (`--turbopack` on both `dev` and `build`). If a package
   needs a webpack-plugin-based integration and has no Turbopack-native
   alternative, stop and flag it to the user instead of silently adding a
   `--webpack` fallback script that changes the project's bundler story.
4. **Never install `next-pwa` or `@serwist/next`.** The service worker
   integration is `@serwist/turbopack` (see [03-pwa.md](./03-pwa.md)). These
   packages solve the same problem but are mutually incompatible with this
   project's Turbopack-only build — don't "fix a PWA bug" by swapping in the
   webpack-based package.
5. **Don't reintroduce `useEffect(() => setState(...), [])` for one-time
   client-only reads.** It's a lint error here, not just a style preference.
   Use `useSyncExternalStore` — see
   [06-conventions.md](./06-conventions.md#client-only-reads-usesyncexternalstore-not-useeffect--setstate).
6. **Don't add a global state library (Redux/Zustand/Jotai/etc.), a
   `services/`/`repositories/` layer, or barrel `index.ts` re-exports**
   unless the user explicitly asks, or an existing feature genuinely can't be
   built without one. See [02-architecture.md](./02-architecture.md#explicitly-avoid).
7. **New features go in `src/features/<name>/`**, not scattered into
   `src/components/`. New shared UI goes in `src/components/{ui,layout,pwa}`;
   new shared logic in `src/hooks/` or `src/server/actions/`. See
   [02-architecture.md](./02-architecture.md) before creating a new top-level
   folder under `src/`.
8. **Manifest icons are generated routes, not files in `public/`.** Don't add
   static PNGs to `public/` for app icons — edit the `ImageResponse` route
   handlers instead.
9. **`app/manifest.ts` is served at `/manifest.webmanifest`.** If you rename
   or move it, update the reference in `src/app/layout.tsx`'s
   `metadata.manifest`.
10. **shadcn components come from the CLI**, not hand-written from memory:
    `pnpm dlx shadcn@latest add <component>`. This repo's `components.json`
    uses a `radix-nova` style that generates components with
    project-specific CSS variables — a hand-written "shadcn-style" component
    will look subtly different.
11. **Never implement real BLE peripheral/advertiser code in this repo.**
    Web Bluetooth (the only Bluetooth API available to a browser/PWA) can
    only scan for and connect to devices ("central" role) — a web page
    cannot make the device advertise itself for others to discover. That
    requires native code. The BLE indicator in `receive-qr-screen.tsx` is,
    and must stay, a visual simulation. See
    [06-conventions.md](./06-conventions.md#mocked-vs-real-boundaries-in-the-squad-feature).
12. **Never invent or "correct" Tunisian tax/regulatory figures** (Timbre
    Fiscal stamp duty, Matricule Fiscal format, etc.). `lib/el-fatoora.ts`'s
    rate is an explicit placeholder — treat it as something to confirm with
    the user against a real Finance Law/BCT circular, not a fact to silently
    replace with a different guessed number.
13. **SQUAD is zero-liability by design — don't reintroduce balances.**
    `LinkedWallet` stores a destination-only routing identifier
    (`routingType`/`routingValue`), never a balance or credential. Don't add
    a "balance" field back, don't call a wallet provider's balance API, and
    don't ask a user for a PIN/password when linking an account — that's the
    core regulatory constraint this app is built around.

## Before you finish a change

Run, in this order, and don't report done until all pass:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

For anything touching the service worker/manifest/icons specifically, also
confirm the build log still shows a `(serwist) N precache entries` line and
spot-check with `pnpm start` + `curl -I` against the routes listed in
[03-pwa.md](./03-pwa.md#verifying-the-sw-after-changes).

## If something in these docs looks wrong

These docs are meant to match the code exactly. If you find a mismatch (e.g.
a doc says a file is at path X but it's actually at Y), trust the code, fix
the doc in the same change, and don't silently work around the discrepancy.
