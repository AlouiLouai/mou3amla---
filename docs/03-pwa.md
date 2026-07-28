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

All four rely on the shared `Mou3amlaMark` (`src/features/mou3amla/mark.tsx`) -
the same gradient-ring "m" badge `LogoLockup` draws inline on the auth/splash
screen, reproduced with fixed hex colors (not `mou3amla.*` tokens: Satori has
no DOM/CSSOM and can't resolve `var(--mou3amla-*)`, and an app icon should
look identical regardless of the viewer's theme anyway). It takes a
`maskable` prop - pass it **only** from the `-maskable` route: it shrinks the
badge so it stays inside Android's adaptive-icon safe zone. Some launchers
crop content outside that zone, so don't reuse the non-maskable (full-size)
badge for `purpose: "maskable"` icons.

## Cross-device viewport height

Full-height screen shells size themselves with two CSS classes in
`src/app/globals.css` instead of Tailwind's `min-h-[100dvh]` arbitrary value -
both declare `height: 100vh` *then* `height: 100dvh` as two separate rules:
browsers that don't recognize the `dvh` unit (older Android WebViews, older
Samsung Internet) silently drop only the second, unrecognized declaration and
keep the `100vh` fallback, instead of dropping the whole rule and collapsing
the shell to `auto` height.

- **`.mou3amla-viewport-h`** - a plain, unconditional `height` cap. Used by
  the two outer wrapper `div`s in `mou3amla-app.tsx` (the body-level
  full-bleed wrapper and the flex row that centers the phone frame on
  desktop), and by the standalone pre-authenticated screens
  (`auth-screen.tsx`, `passkey-screen.tsx`, `verification-flow-screen.tsx`),
  which don't own an internal scroller and rely on normal page-level scroll
  if their content ever exceeds one viewport.
- **`.mou3amla-shell-h`** - the same fixed height on mobile, but at `>=640px`
  (desktop, where the app renders as a centered, padded phone frame instead
  of full-bleed) it switches to `height: auto` so the shell can shrink to fit
  inside its padded parent instead of forcing its own 100dvh and getting
  clipped. Used only by the innermost phone-frame `div` in `mou3amla-app.tsx`
  - the one that also carries `overflow-hidden` and `sm:min-h-0`. This is
  deliberately a *fixed*, not `min-height`, box: `ScreenFrame`'s internal
  `.mou3amla-scroll` div is what should scroll, and that only works if this
  shell has a capped height for its own `overflow-hidden` to actually clip
  against - a `min-height` here let the box grow with its content instead,
  handing scroll to the whole page and dragging the fixed header/bottom nav
  along with it. If the mobile shell ever appears to page-scroll instead of
  keeping header/nav fixed, check this class first.

Use `mou3amla-viewport-h` for any new full-height standalone screen (auth-like
flows without their own internal scroller); use `mou3amla-shell-h` only for a
shell that, like the authenticated app frame, owns its own internal
scrolling region and needs desktop shrink-to-fit behavior.

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

### Update flow (new worker available)

`src/app/sw.ts` deliberately does **not** set `skipWaiting: true`. A newly
installed worker sits in the browser's normal "waiting" state instead of
activating itself the instant it finishes installing - `clientsClaim: true`
is still set, so once it *does* activate it takes over immediately without
needing a full navigation.

`src/components/pwa/update-prompt.tsx` is what surfaces this to the user: it
listens for `serwist.addEventListener("waiting", ...)` via `useSerwist()`
(from `@serwist/turbopack/react`) and opens a center modal only when
`event.isUpdate` is true (false/undefined the very first time a worker is
ever installed for this origin - there's nothing to update from yet, so no
modal). Confirming sends `{ type: "SKIP_WAITING" }` to the waiting worker
(`serwist.messageSkipWaiting()` - Serwist's core package always listens for
that exact message unless told to skip waiting unconditionally, which this
worker isn't) and reloads once the `"controlling"` event fires, i.e. once the
new worker has actually taken over.

Do not reintroduce `skipWaiting: true` without also removing this component -
the two are mutually exclusive: `skipWaiting: true` activates a new worker
before the user ever sees the prompt, making `UpdatePrompt`'s "waiting" listener
fire too late (or not at all) to mean anything.

### Verifying the SW after changes

```bash
pnpm build     # look for "(serwist) N precache entries" in the output
pnpm start
curl -I http://localhost:3000/serwist/sw.js   # should be 200
```

## Launch splash screen

`src/components/pwa/splash-screen.tsx` is a server-rendered, no-client-JS
overlay that covers Android, which - unlike iOS's `apple-touch-startup-image`
- has no manifest field for a custom launch image. A pure-CSS animation
(`mou3amla-splash-out` in `globals.css`) fades it out ~1.1s after paint with
no hydration-timing dependency.

It must only flash once per real app launch, not once per screen. The auth
handoff (`/` -> `/verify` -> `/home`) uses server-side `redirect()`, and each
redirect is a brand-new document load that remounts `RootLayout` - without
gating, the splash would replay on every one of those steps. `RootLayout`
reads a `mou3amla-splash-seen` cookie (via `next/headers` `cookies()`) and
skips rendering `<SplashScreen />` once it's set; the splash component itself
sets that cookie via an inline `<script>` the instant it mounts. It's a
session cookie (no `Max-Age`) rather than `localStorage`, on purpose: closing
and reopening the installed PWA ends that browser session, which is exactly
when the launch splash should be allowed to reappear.

The splash content is `src/features/mou3amla/components/logo-lockup.tsx`
(`LogoLockup`) - the "m" badge + "mou3amla" wordmark, with an optional
tagline - rendered with no `tagline` prop here. This is the same component
the auth screen (`auth-screen.tsx`) renders with a tagline, so the very first
and very last pre-authenticated things a user sees are pixel-identical; there
is no longer a separate static splash image asset. `LogoLockup`'s entrance
(mark pops in, then the wordmark, then the tagline if present) is pure CSS
(`mou3amla-mark-in` / `mou3amla-fadeup` in `globals.css`, driven by inline
`animation` styles with staggered delays) so it plays correctly on the
splash's server-rendered first paint - no JS timing dependency - and is
already covered by the global `prefers-reduced-motion: reduce` override.
Pass `animate={false}` to render it statically if a future placement needs
that (none currently do).

## Theme color (installed vs. browser)

`siteConfig.themeColor` (`src/config/site.ts`) drives both the browser's
`viewport.themeColor` meta tag and the manifest's `theme_color` - the
installed/standalone PWA's Android status bar and task-switcher card
background. It's set to `#000000`, matching `backgroundColor` (the same
value used for the manifest's splash `background_color`) and the app's
actual default dark background, not the accent blue - a color mismatch here
is far more visible once installed standalone (a solid status-bar block
sitting directly above the app's own black UI, no browser chrome to buffer
it) than as a thin address-bar tint in a browser tab. If you ever change the
app's default/pre-auth background away from black, update this alongside it
rather than letting it drift back out of sync.

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

- the header zone is fixed per screen - it never scrolls or leaves its
  position
- the bottom navigation rail is fixed over the content pane at all times - it
  never scrolls away, hides, or changes position
- only the central content pane scrolls

That fixed positioning is owned entirely by
`src/features/mou3amla/components/screen-frame.tsx`, not by individual screens:
it measures the footer's real height via `ResizeObserver` into a
`--mou3amla-bottomnav-h` CSS variable so the scrollable content always reserves
enough bottom space, independent of `env(safe-area-inset-bottom)` differences
across devices. Do not reimplement scroll/sticky handling per screen — extend
`screen-frame.tsx` instead. Supporting CSS lives in `src/app/globals.css`. If
a screen starts scrolling edge-to-edge again, or the header/nav stop staying
fixed on any mobile browser, treat that as a regression.

**Fixed position is not the same as static appearance.** `BottomNav`
(`bottom-nav.tsx`) reads scroll direction from `ScreenFrame` via the
`useScrollCompact` context (`screen-frame.tsx` tracks `scrollTop` on the
content pane's own scroll handler and exposes a boolean through a Provider
wrapped around the footer) and shrinks its tab icons/padding on scroll-down,
restoring them on scroll-up or near the top of the pane - an Instagram-style
compacting effect, done by resizing the nav's own contents with a CSS
`transition`, not by moving, hiding, or `translateY`-animating the nav
itself. The nav's own `position`/placement never changes; only its rendered
size does.
