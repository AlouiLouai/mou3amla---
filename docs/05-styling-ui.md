# Styling & UI

## Tailwind CSS v4

Tailwind v4 configuration lives **in CSS**, not a `tailwind.config.ts`:

- `src/app/globals.css` imports Tailwind and defines design tokens via
  `@theme inline { ... }`, referencing CSS custom properties exposed from
  `:root`.
- There is no separate JS/TS Tailwind config file to edit. If you need a new
  design token, add the CSS variable in `globals.css` and then expose it
  through `@theme inline`.

## shadcn/ui

Installed via the current (`shadcn@latest`) CLI, **not** the legacy
`shadcn-ui` package. Config: `components.json` at the project root -
`style: "radix-nova"`, `baseColor: "neutral"`, `iconLibrary: "lucide"`.

- **Add a new primitive**: `pnpm dlx shadcn@latest add <component>` - this
  writes into `src/components/ui/` and wires any needed CSS variables
  automatically.
- **Do not hand-write a "shadcn-style" component** from memory. Generated
  components in this repo rely on project-specific class patterns and slots.
- Icons: `lucide-react`. Do not add a second icon library.

## Theming

The product (Mou3amla) uses an Instagram-derived visual system built around a
compact mobile layout, with a **real, user-facing light/dark toggle** (Profile
> Settings > Dark Mode). Every `mou3amla.*` surface/text token resolves
through a CSS custom property, so flipping the `.dark` class on `<html>`
repaints the whole app with no per-component changes needed:

- `mou3amla.bg` / `mou3amla.surface`: page background - `var(--mou3amla-bg)`
  (pure black `#000000` in dark, `#ffffff` in light)
- `mou3amla.card`: `var(--mou3amla-card)` - the standard elevated surface
  (cards, rows, chips) - `#121212` dark / `#f7f7f8` light
- `mou3amla.cardAlt`: `var(--mou3amla-card-alt)` - alt surface / row dividers
- `mou3amla.text` / `mou3amla.textMuted` / `mou3amla.textFaint`: theme-reactive
  text tiers
- `mou3amla.border` / `mou3amla.borderStrong`: theme-reactive border tiers
- `mou3amla.hero`: **fixed** `#0A0A0A` in both themes - deliberately not
  reactive. Used for hero banner cards (passkey-screen,
  verification-flow-screen) that stay dark-branded even in light mode, always
  paired with hardcoded white text. Not a general-purpose "dark surface" -
  use `mou3amla.card` for that.
- `mou3amla.accent`: Instagram blue `#0095F6` - **fixed** in both themes, not
  a CSS var. Primary actions, links, **and** all "positive" semantic states
  (verified, confirmed, success) - see `status-tone.ts` below
- `mou3amla.subtle`: `#7A3EF0` (purple) - **fixed**, secondary emphasis, pending states
- `mou3amla.destructive`: `#ED4956` (Instagram red) - **fixed**, destructive/error/unread states
- `igGradient` (exported alongside `mou3amla`): `linear-gradient(135deg, #0095F6, #7A3EF0, #ED4956)`
  - literally `accent`/`subtle`/`destructive` as gradient stops, so the flat
    palette and the gradient can't visually drift apart. Reused for avatar
    "story rings" (see `AppHeader`), the auth/passkey/verification hero logo
    badge, and gradient-bordered highlight cards. Don't hand-roll a second
    blue-purple-red gradient elsewhere - import this one.

`alpha(color, opacity)` accepts either a fixed hex value (accent/subtle/
destructive/hero) or one of the `var(--mou3amla-*)` tokens above - for a CSS
var it returns a `color-mix(in srgb, var(...) X%, transparent)` string rather
than doing hex math, so the resulting translucent color still tracks whichever
theme is active. Never hand-roll `rgba()` math against a `mou3amla.*` token
that might be a CSS var - always go through `alpha()`.

These screen-level colors come from `src/features/mou3amla/constants.ts`, not from
the full shadcn semantic color scale. Wallet/provider brand colors in
`src/features/wallets/constants.ts` remain the one deliberate exception -
real fintech brand colors (Flouci green, Konnect teal, etc.), never touched
by a Mou3amla palette change.

**Status-tone colors are centralized**, not hand-rolled per screen: import
`statusToneColor` from `src/features/mou3amla/status-tone.ts` (`"positive" |
"pending" | "negative" | "neutral"`) rather than hardcoding a green/orange/red
for a verified/confirmed/pending/rejected badge. This app previously had four
independent, mutually-inconsistent hardcoded greens for "verified" alone
before this was consolidated - don't reintroduce a fifth.

- `src/components/layout/theme-provider.tsx` wraps `next-themes` with
  `defaultTheme="dark"` and `enableSystem={false}` (predictable, user-driven
  only - not OS-preference-driven). The toggle itself lives in the profile
  settings screen via `next-themes`' `useTheme()`.
- **The pre-authentication brand shell stays permanently dark**, regardless of
  the toggle: `auth-screen.tsx` and `passkey-screen.tsx` add a literal `dark`
  class to their own root element. Because `.dark { --mou3amla-*: ... }` is
  just a normal CSS class rule, nesting it locally overrides those custom
  properties for that subtree (including `LogoLockup`) no matter what the
  user later picks - this is a deliberate brand decision (consistent with the
  always-dark splash screen background in `.mou3amla-splash`), not a bug.
  Don't remove it while "fixing" light-mode contrast there.
- Never pair a hardcoded Tailwind color utility (`text-white`, `bg-white`,
  `text-slate-*`, ...) with a `mou3amla.*` token background outside of
  `hero`/`accent`/`subtle`/`destructive` (the fixed ones) or a fixed
  brand/wallet color - it will silently break in one theme. Use
  `style={{ color: mou3amla.text }}` etc. instead. `src/app/dev/mock-checkout`
  is the one deliberate exception: it's a standalone neutral payment page,
  intentionally not built on the Mou3amla palette, and doesn't participate in
  the toggle either way.
- The `<html>` tag keeps `suppressHydrationWarning`, which is still required by
  `next-themes`.
- If you add a screen that should use the normal shadcn theme variables rather
  than the Mou3amla palette, use `--background`, `--foreground`, etc. instead of
  inventing a parallel token system - these also now diverge between `:root`
  and `.dark`.

## Mou3amla Elevation & Motion

Beyond raw colors, `src/features/mou3amla/constants.ts` exports shared
`cardShadow` and `raisedShadow` strings. Use those instead of inventing a new
shadow per screen so elevation stays consistent.

The shell transition lives in `src/features/mou3amla/components/mou3amla-app.tsx`.
Do not add a different page-enter animation on every individual screen unless
there is a strong product reason.

The mobile shell also uses a shared frame primitive in
`src/features/mou3amla/components/screen-frame.tsx`. Keep headers and bottom nav
outside the scrollable pane; only the body content should use the shell
scroller.

`cardShadow`/`raisedShadow` are plain dark elevation (`rgba(0,0,0,...)`), not a
colored glow - a pink-tinted shadow made sense on the old white surfaces; on
today's black surfaces a colored shadow would just look like a color cast, so
these lean on real shadow depth instead, matching the mockup's mostly-flat,
border-driven card style. If you want more depth, add it carefully; heavy
blur and oversized shadow stacks make low-end mobile devices feel slow.

## Toasts

App events use `sonner` through the shadcn wrapper in
`src/components/ui/sonner.tsx`.

- Toasts render `top-center` with a safe-area-aware offset
  (`max(1rem, env(safe-area-inset-top))`) rather than sonner's default
  `bottom-right`. This is deliberate: the bottom nav in the authenticated
  shell floats over content at all times (see
  [03-pwa.md](./03-pwa.md#mobile-shell-behavior)), so a bottom-anchored toast
  would visually collide with it. Don't move toasts back to the bottom
  without also accounting for that.
- Keep toast visuals aligned with the Mou3amla palette.
- Prefer concise operational copy: linked, routed, verified, failed.
- Use success/error/loading states for payment, link, passkey, and
  notification events instead of custom ad hoc banners.

## Fonts

The app uses:

- `Plus Jakarta Sans` for body and interface text
- `Syne` for headings
- `IBM Plex Mono` for numbers, references, phone data, and transaction ids

These are loaded in `src/app/layout.tsx` and exposed through CSS variables that
map to Tailwind's `--font-sans`, `--font-heading`, and `--font-mono`.
