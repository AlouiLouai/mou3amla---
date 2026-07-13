# Styling & UI

## Tailwind CSS v4

Tailwind v4 configuration lives **in CSS**, not a `tailwind.config.ts`:

- `src/app/globals.css` imports Tailwind and defines design tokens via
  `@theme inline { ... }`, referencing CSS custom properties
  (`--background`, `--color-primary`, etc.) defined in `:root` and `.dark`.
- Colors are OKLCH values, not hex/rgb.
- There is no separate JS/TS Tailwind config file to edit — if you need a new
  design token, add the CSS variable in `:root`/`.dark` and expose it via
  `@theme inline`, following the existing entries.

## shadcn/ui

Installed via the current (`shadcn@latest`) CLI, **not** the legacy
`shadcn-ui` package. Config: `components.json` at the project root —
`style: "radix-nova"`, `baseColor: "neutral"`, `iconLibrary: "lucide"`.

- **Add a new primitive**: `pnpm dlx shadcn@latest add <component>` — this
  writes into `src/components/ui/` and wires any needed CSS variables
  automatically. Don't hand-write a "shadcn-style" component from memory;
  the generated ones use project-specific class patterns (e.g. `--card-spacing`
  custom properties, `data-slot` attributes) that are easy to get subtly
  wrong by hand.
- **Don't modify generated files in `src/components/ui/` to add variants**
  unless following the existing `cva` (class-variance-authority) pattern
  already used in files like `button.tsx`.
- Icons: `lucide-react`. Use existing icons from this package; don't add a
  second icon library.

## Theming

The product (SQUAD) is an intentionally **fixed-dark, monochrome**
experience (Instagram-iOS dark-mode style) — its screens use hardcoded hex
colors from `src/features/squad/constants.ts` (`squad.bg`/`squad.card` pure
black/near-black, `squad.accent` white, `squad.subtle` iOS system gray,
`squad.destructive` reserved only for destructive actions like Log Out),
not the shadcn light/dark CSS variables. Wallet/provider brand colors
(`PROVIDERS` in `src/features/wallets/constants.ts`) are the one deliberate
exception — they stay colorful, like Instagram avatars, even though the app
chrome around them is monochrome. Accordingly:

- `src/components/layout/theme-provider.tsx` wraps `next-themes`'s
  `ThemeProvider` with **`forcedTheme="dark"`** — there is no user-facing
  light/dark toggle in this app. This still exists (rather than removing
  `next-themes` outright) because `src/components/ui/sonner.tsx` reads the
  current theme to style toasts, and it keeps the door open for a future
  screen that does use the shadcn theme tokens (e.g. `~offline`, which still
  renders shadcn `Card` components).
- The `<html>` tag has `suppressHydrationWarning` (required by `next-themes`
  because it patches the class attribute before hydration) — don't remove it
  thinking it's an oversight.
- If you add a new screen that should follow the *shadcn* theme instead of
  SQUAD's fixed palette (unlikely, but possible for an internal/admin view),
  use the existing `--background`/`--foreground`/etc. CSS variables rather
  than SQUAD's hardcoded hex values.

## SQUAD's elevation/motion system

Beyond raw colors, `src/features/squad/constants.ts` exports shared
`cardShadow`/`raisedShadow` strings — use these instead of hand-rolling a new
`box-shadow` per component, so elevation reads consistently across screens.
Primary actions are flat `squad.accent` (white) fills, not gradients — there
is no `gradients` export anymore; don't reintroduce one. Screen-level
transitions come from a single `animate-[squad-screen-in_...]` wrapper in
`squad-app.tsx` (keyed by `screen`) — don't add a per-screen transition, add
it once there.

## Fonts

Inter (sans) / IBM Plex Mono (mono) via `next/font/google`, exposed as CSS
variables `--font-inter` / `--font-ibm-plex-mono` applied on `<html>` in
`src/app/layout.tsx`, then wired to Tailwind's `--font-sans` / `--font-mono`
in `globals.css`'s `@theme inline` block. `--font-heading` aliases the sans
font — there is no separate heading font loaded. This pairing (Inter +
IBM Plex Mono) matches the SQUAD design's typography (mono is used for
amounts, phone numbers, tx ids — anything tabular/numeric).
