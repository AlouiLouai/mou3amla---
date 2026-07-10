# PWA: Manifest, Service Worker, Icons, Install

This app is installable and works offline. The pieces below are wired
together and **must stay consistent** if you touch any one of them.

## Manifest

- Source: `src/app/manifest.ts` (Next.js `MetadataRoute.Manifest` convention).
- Served at **`/manifest.webmanifest`** (Next.js's fixed output path for a
  generated `manifest.ts` — not `/manifest.json`).
- Referenced from `src/app/layout.tsx` via
  `metadata.manifest = "/manifest.webmanifest"`. If you ever rename one side,
  update the other.
- Site name/description/colors come from `src/config/site.ts` — edit that
  file, not hardcoded strings in `manifest.ts`.
- Icons array points at generated routes (see below), not static files.

## Icons

All icons are **generated, not static assets**, using `next/og`'s
`ImageResponse`:

- `src/app/icon.tsx` — favicon-ish tab icon (32×32), auto-injected `<head>` tag.
- `src/app/apple-icon.tsx` — iOS home-screen icon (180×180), auto-injected.
- `src/app/icon-192.png/route.tsx` — 192×192 manifest icon (`purpose: "any"`).
- `src/app/icon-512.png/route.tsx` — 512×512 manifest icon (`purpose: "any"`).
- `src/app/icon-512-maskable.png/route.tsx` — 512×512 with a padded safe zone
  (`purpose: "maskable"`) for Android adaptive icons.

To change the icon's look, edit these route files (color, letter, shape).
Do **not** add PNG files to `public/` for this purpose — nothing references
them, and the manifest/head tags already point at the generated routes.

## Service worker (Serwist, Turbopack-native)

This is the part most likely to be implemented wrong by an agent working from
older training data, because the popular `next-pwa` package and even
Serwist's own classic `@serwist/next` webpack plugin **do not work** with
Turbopack builds (this project has no webpack path).

The actual setup:

- **`next.config.ts`** wraps the Next config with `withSerwist` from
  `@serwist/turbopack`.
- **`src/app/sw.ts`** is the service worker source: precaches build assets
  (via `self.__SW_MANIFEST`, injected at build time), enables navigation
  preload, and falls back to `/~offline` for document requests when offline.
  Uses `defaultCache` from `@serwist/turbopack/worker` for baseline runtime
  caching strategies.
- **`src/app/serwist/[path]/route.ts`** is the build/serve route: calls
  `createSerwistRoute({ swSrc: "src/app/sw.ts", additionalPrecacheEntries, useNativeEsbuild: true })`
  and re-exports the route handler's `dynamic`/`GET`/etc. This is what
  actually bundles `sw.ts` (via esbuild) and serves it at `/serwist/sw.js`.
- **`src/app/layout.tsx`** wraps the app in `<SerwistProvider swUrl="/serwist/sw.js">`
  from `@serwist/turbopack/react`, which registers the service worker on the
  client.
- **`src/app/~offline/page.tsx`** is the offline fallback page shown when a
  navigation can't be served from cache or network.
- **`.gitignore`** excludes `/public/sw*` and `/public/swe-worker*` — Serwist
  writes build output there; don't commit it, don't hand-edit it.

If you need to change caching behavior (add a runtime caching rule, change
the offline fallback route, etc.), edit `src/app/sw.ts` — never edit a file
under `public/` directly, it gets regenerated on every build.

### Verifying the SW after changes

```bash
pnpm build     # look for "(serwist) N precache entries" in the output
pnpm start
curl -I http://localhost:3000/serwist/sw.js   # should be 200
```

## Install prompt

`src/components/pwa/install-prompt.tsx` handles the `beforeinstallprompt`
event (Chromium/Android) and shows manual "Add to Home Screen" instructions
on iOS (which has no programmatic install API). Dismissal is remembered in
`localStorage` under the key `pwa-install-dismissed`.

Note the implementation deliberately avoids `useEffect(() => setState(...))`
for one-time client reads (iOS detection, standalone-mode detection,
dismissed flag) — see [06-conventions.md](./06-conventions.md#client-only-reads-usesyncexternalstore-not-useeffect--setstate)
for why, before "simplifying" this back to a plain effect.

## Network status

`src/hooks/use-online-status.ts` (a `useSyncExternalStore` over the
`online`/`offline` window events) and
`src/components/pwa/network-status-toast.tsx` (a sonner toast on transition)
give user-visible feedback when connectivity changes. This is separate from
the service worker's offline fallback — the toast is about UX feedback, the
SW fallback is about actually serving something instead of a browser error.
