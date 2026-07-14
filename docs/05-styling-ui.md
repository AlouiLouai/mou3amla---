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

The product (SQUAD) now uses an intentionally **fixed-light fintech** visual
system built around a compact mobile layout:

- `squad.surface` / `squad.card`: white surfaces
- `squad.bg`: soft pink-tinted page wash
- `squad.hero`: near-black hero sections
- `squad.accent`: hot pink `#FF0083` for primary actions
- `squad.subtle`: orange `#FF8D28` for secondary emphasis
- `squad.destructive`: reserved for destructive and error states

These screen-level colors come from `src/features/squad/constants.ts`, not from
the full shadcn semantic color scale. Wallet/provider brand colors in
`src/features/wallets/constants.ts` remain the one deliberate exception.

- `src/components/layout/theme-provider.tsx` still wraps `next-themes` with
  **`forcedTheme="light"`**. There is no user-facing light/dark toggle.
- The `<html>` tag keeps `suppressHydrationWarning`, which is still required by
  `next-themes`.
- If you add a screen that should use the normal shadcn theme variables rather
  than the SQUAD palette, use `--background`, `--foreground`, etc. instead of
  inventing a parallel token system.

## SQUAD Elevation & Motion

Beyond raw colors, `src/features/squad/constants.ts` exports shared
`cardShadow` and `raisedShadow` strings. Use those instead of inventing a new
shadow per screen so elevation stays consistent.

The shell transition lives in `src/features/squad/components/squad-app.tsx`.
Do not add a different page-enter animation on every individual screen unless
there is a strong product reason.

The mobile shell also uses a shared frame primitive in
`src/features/squad/components/screen-frame.tsx`. Keep headers and bottom nav
outside the scrollable pane; only the body content should use the shell
scroller.

Recent performance tuning intentionally softened shell and card shadows in
`src/features/squad/constants.ts`. If you want more depth, add it carefully;
heavy blur and oversized shadow stacks make low-end mobile devices feel slow.

## Toasts

App events use `sonner` through the shadcn wrapper in
`src/components/ui/sonner.tsx`.

- Toasts render `top-center` with a safe-area-aware offset
  (`max(1rem, env(safe-area-inset-top))`) rather than sonner's default
  `bottom-right`. This is deliberate: the bottom nav in the authenticated
  shell floats over content and slides in/out on scroll (see
  [03-pwa.md](./03-pwa.md#mobile-shell-behavior)), so a bottom-anchored toast
  would visually collide with it. Don't move toasts back to the bottom
  without also accounting for that.
- Keep toast visuals aligned with the SQUAD palette.
- Prefer concise operational copy: linked, routed, verified, failed.
- Use success/error/loading states for payment, link, OTP, and notification
  events instead of custom ad hoc banners.

## Fonts

The app uses:

- `Plus Jakarta Sans` for body and interface text
- `Syne` for headings
- `IBM Plex Mono` for numbers, references, phone data, and transaction ids

These are loaded in `src/app/layout.tsx` and exposed through CSS variables that
map to Tailwind's `--font-sans`, `--font-heading`, and `--font-mono`.
