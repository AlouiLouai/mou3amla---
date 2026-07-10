# Tech Stack

This is a **Next.js 16 App Router** PWA. Next.js 16 is recent enough (released
2025) that generic training knowledge about "Next.js" is frequently wrong for
this repo — see the version notes below before assuming anything.

## Core

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16.2 (App Router) | **Turbopack is the default bundler** for both `next dev` and `next build` — there is no webpack fallback configured. Do not add `next.config.js` webpack customizations expecting them to run; they won't under Turbopack. |
| Package manager | **pnpm** | Never use `npm install` / `yarn add` — it will create a second lockfile and desync `node_modules`. Always `pnpm add` / `pnpm add -D`. |
| Language | TypeScript, strict mode | `tsconfig.json` includes `"webworker"` in `lib` alongside `"dom"` — this is required for `src/app/sw.ts` to type-check and is intentional, not a mistake to "clean up". |
| UI library | React 19 | Server Components by default; add `"use client"` only where interactivity/hooks/browser APIs are needed. |
| Styling | Tailwind CSS v4 | Config lives in CSS (`src/app/globals.css`) via `@theme inline`, not a `tailwind.config.ts` file. There is no JS Tailwind config to edit. |
| Components | shadcn/ui (`radix` base, `nova` preset) | See [05-styling-ui.md](./05-styling-ui.md). |
| Theming | `next-themes` | Class-based dark mode (`.dark` on `<html>`), not a custom context. |
| Validation | `zod` (v4) | Used for env validation in `src/config/env.ts`. |
| Toasts | `sonner` (via shadcn wrapper) | `src/components/ui/sonner.tsx` — themed automatically from `next-themes`. |
| Offline / installability | `@serwist/turbopack` + `serwist` | **Not** `next-pwa`, **not** `@serwist/next` (webpack-based). See [03-pwa.md](./03-pwa.md) for why this distinction matters. |
| Request interception | `proxy.ts` | **Not** `middleware.ts`. Next.js 16 renamed the file convention; the old name is deprecated. See [04-routing-and-proxy.md](./04-routing-and-proxy.md). |

## Version-sensitive facts an agent is likely to get wrong

- **Turbopack is default**, not opt-in. `package.json` scripts explicitly pass
  `--turbopack` to `dev`/`build` for clarity, but even without the flag it's
  the default in this Next.js version.
- **`middleware.ts` does not exist in this repo on purpose.** The file is
  `src/proxy.ts`, exporting `function proxy(request)` instead of
  `function middleware(request)`. Same runtime, same `config.matcher` API —
  only the name changed. Do not "restore" a `middleware.ts`.
- **shadcn's CLI is not the old `npx shadcn-ui@latest add button` flow.** This
  repo uses `shadcn@latest` (package renamed) with a `components.json` that
  has a `style: "radix-nova"` and a `preset` concept that didn't exist in
  older shadcn docs/training data. Run `pnpm dlx shadcn@latest add <component>`
  to add new primitives — don't hand-write shadcn components from memory, the
  generated ones use project-specific CSS variables (`--card-spacing`, OKLCH
  colors, etc.) that hand-written versions will miss.
- **Serwist's classic `withSerwistInit` / `@serwist/next` (webpack plugin)
  will not work here** — this project has no webpack build path. The
  Turbopack-native integration is `@serwist/turbopack`, a distinct package
  with a distinct API (`withSerwist`, `createSerwistRoute`,
  `@serwist/turbopack/worker`, `@serwist/turbopack/react`). Don't mix the two.
- **`app/manifest.ts` is served at `/manifest.webmanifest`**, not
  `/manifest.json`. The root layout's `metadata.manifest` must match.
- Icons (`icon-192.png`, `icon-512.png`, `icon-512-maskable.png`) are
  **generated at request/build time** via `next/og`'s `ImageResponse`, not
  static files in `public/`. If you want to change how they look, edit the
  route handlers under `src/app/icon-*.png/route.tsx` — don't drop PNGs into
  `public/` and expect them to be picked up (the manifest points at the
  routes).
