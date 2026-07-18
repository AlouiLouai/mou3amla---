# PWA: Manifest, Service Worker, Icons, Install

This app is installable and works offline. The pieces below are wired
together and must stay consistent if you touch any one of them.

## Manifest

- Source: `src/app/manifest.ts` (Next.js `MetadataRoute.Manifest` convention).
- Served at `/manifest.webmanifest` (Next.js's fixed output path for a
  generated `manifest.ts`, not `/manifest.json`).
- Referenced from `src/app/layout.tsx` via
  `metadata.manifest = "/manifest.webmanifest"`. If you ever rename one side,
  update the other.
- Site name, description, and colors come from `src/config/site.ts`. Edit that
  file, not hardcoded strings in `manifest.ts`.
- Icons array points at generated routes, not static files.

## Icons

All icons are generated, not static assets, using `next/og`'s
`ImageResponse`:

- `src/app/icon.tsx` - favicon-style tab icon (32x32), auto-injected `<head>` tag
- `src/app/apple-icon.tsx` - iOS home-screen icon (180x180), auto-injected
- `src/app/icon-192.png/route.tsx` - 192x192 manifest icon (`purpose: "any"`)
- `src/app/icon-512.png/route.tsx` - 512x512 manifest icon (`purpose: "any"`)
- `src/app/icon-512-maskable.png/route.tsx` - 512x512 padded safe-zone icon
  (`purpose: "maskable"`) for Android adaptive icons

To change the icon look, edit these route files directly. Do not add PNG files
to `public/` for this purpose because nothing references them.

All four rely on the shared `Mou3amlaMark` (`src/features/mou3amla/mark.tsx`), which
takes a `maskable` prop. Pass it **only** from the `-maskable` route: it
shrinks the badge so its corners stay inside Android's ~40%-radius
adaptive-icon safe zone. Some Android launchers (and plain circular masks)
crop anything outside that circle, so don't reuse the non-maskable (`0.74`
scale) badge for `purpose: "maskable"` icons.

## Cross-device viewport height

Six top-level screen shells (`mou3amla-app.tsx`, `auth-screen.tsx`,
`passkey-screen.tsx`, `verification-flow-screen.tsx`) size themselves with the
`.mou3amla-viewport-h` CSS class (`src/app/globals.css`) instead of Tailwind's
`min-h-[100dvh]` arbitrary value. That class declares `min-height: 100vh`
*then* `min-height: 100dvh` as two separate rules: browsers that don't
recognize the `dvh` unit (older Android WebViews, older Samsung Internet)
silently drop only the second, unrecognized declaration and keep the `100vh`
fallback, instead of dropping the whole rule and collapsing the shell to
`auto` height. Use `mou3amla-viewport-h` for any new full-height screen shell
instead of reaching for `min-h-[100dvh]` directly.

## Service worker (Serwist, Turbopack-native)

This is the part most likely to be implemented wrong by older training data,
because `next-pwa` and Serwist's webpack integration do not fit this repo's
Turbopack-only build.

The actual setup:

- `next.config.ts` wraps the Next config with `withSerwist` from
  `@serwist/turbopack`
- `src/app/sw.ts` is the service worker source: precaches build assets, enables
  navigation preload, and falls back to `/~offline` for document requests
- `src/app/sw.ts` also forces `NetworkOnly` for `/api/qr/*` and `/api/nearby/*`
  ahead of Serwist's `defaultCache`, so a flaky connection can never make the
  worker serve a stale cached QR/nearby-handoff response for a payment. Every
  other same-origin API route still falls under `defaultCache`'s default
  `NetworkFirst` behavior. Keep any new payment-sensitive `GET` route in that
  `NetworkOnly` list.
- `src/app/serwist/[path]/route.ts` bundles and serves the worker at
  `/serwist/sw.js`
- `src/app/layout.tsx` wraps the app in
  `<SerwistProvider swUrl="/serwist/sw.js">`
- The same layout exports a mobile-tuned `viewport` object using
  `viewportFit: "cover"` and `interactiveWidget: "resizes-content"` so the
  shell behaves better on notched phones and with the mobile keyboard
- `src/app/~offline/page.tsx` is the offline fallback page shown when a
  navigation cannot be served from cache or network
- `.gitignore` excludes generated worker artifacts under `public/`

If you need to change caching behavior, edit `src/app/sw.ts`. Never hand-edit
generated worker output under `public/`.

### Verifying the SW after changes

```bash
pnpm build     # look for "(serwist) N precache entries" in the output
pnpm start
curl -I http://localhost:3000/serwist/sw.js   # should be 200
```

## Install prompt

`src/components/pwa/install-prompt.tsx` handles the `beforeinstallprompt`
event on Chromium/Android and shows manual "Add to Home Screen" instructions
on iOS. Dismissal is remembered in `localStorage` under
`pwa-install-dismissed`. Its fixed positioning uses
`bottom-[max(1rem,env(safe-area-inset-bottom))]` (and the equivalent on the
right, in the `sm:` desktop-preview layout) so it doesn't sit under an
Android gesture-nav bar or a notch in landscape. Keep that pattern for any
other `fixed`-positioned chrome.

The implementation deliberately avoids `useEffect(() => setState(...))` for
one-time client reads. See
[06-conventions.md](./06-conventions.md#client-only-reads-prefer-usesyncexternalstore)
before "simplifying" it back to a plain effect.

## Network status

`src/hooks/use-online-status.ts` and
`src/components/pwa/network-status-toast.tsx` give user-visible feedback when
connectivity changes. This is separate from the service worker's offline
fallback: the toast is UX feedback, the worker fallback is about serving
something useful instead of a browser error.

## Mobile shell behavior

The in-app shell intentionally behaves like a compact native container:

- the header zone is fixed per screen - it never scrolls, hides, or resizes
- the bottom navigation rail is fixed over the content pane at all times - no
  auto-hide, no compacting on scroll, no `translateY` animation
- only the central content pane scrolls

That layout is owned entirely by
`src/features/mou3amla/components/screen-frame.tsx`, not by individual screens:
it measures the footer's real height via `ResizeObserver` into a
`--mou3amla-bottomnav-h` CSS variable so the scrollable content always reserves
enough bottom space, independent of `env(safe-area-inset-bottom)` differences
across devices. Do not reimplement scroll/sticky handling per screen — extend
`screen-frame.tsx` instead. Supporting CSS lives in `src/app/globals.css`. If
a screen starts scrolling edge-to-edge again, or the header/nav stop staying
fixed on any mobile browser, treat that as a regression.
