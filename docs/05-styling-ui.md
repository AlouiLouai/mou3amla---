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

The product (SQUAD) is an intentionally **fixed-dark** experience — its
screens use hardcoded hex colors from `src/features/squad/constants.ts`
(`squad.bg`, `squad.green`, `squad.purple`, etc.), not the shadcn light/dark
CSS variables. Accordingly:

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

## Fonts

Inter (sans) / IBM Plex Mono (mono) via `next/font/google`, exposed as CSS
variables `--font-inter` / `--font-ibm-plex-mono` applied on `<html>` in
`src/app/layout.tsx`, then wired to Tailwind's `--font-sans` / `--font-mono`
in `globals.css`'s `@theme inline` block. `--font-heading` aliases the sans
font — there is no separate heading font loaded. This pairing (Inter +
IBM Plex Mono) matches the SQUAD design's typography (mono is used for
amounts, phone numbers, tx ids — anything tabular/numeric).
