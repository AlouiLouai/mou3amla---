# Conventions

## `"use client"` boundaries

Default to Server Components. Add `"use client"` only at the component that
actually needs hooks/state/effects/browser APIs, and keep that boundary as
low in the tree as practical (don't mark a whole page client just because one
child needs interactivity — extract the interactive part instead).

## Don't write to a ref during render

The same lint suite also flags `someRef.current = x` executed directly in a
component's render body ("Cannot access refs during render" /
`react-hooks/refs`) — e.g. the common "keep a ref mirroring the latest state
for async callbacks" pattern. Do the write inside a dependency-less
`useEffect` instead:

```tsx
// ❌ Flagged
const stateRef = useRef(state);
stateRef.current = state;

// ✅ Fine — write happens after render, not during it
const stateRef = useRef(state);
useEffect(() => {
  stateRef.current = state;
});
```

See `src/features/squad/hooks/use-squad-app.ts` for a real instance (timers
started from event handlers read `stateRef.current` to get the latest state
instead of a stale closure).

## Client-only reads: `useSyncExternalStore`, not `useEffect` + `setState`

This codebase's ESLint config (`eslint-config-next` 16.x, via
`eslint-plugin-react-hooks` v7 / React Compiler lint rules) **errors** on the
classic pattern:

```tsx
// ❌ Flagged: "Avoid calling setState() directly within an effect"
useEffect(() => {
  setSomething(readFromLocalStorageOrNavigator());
}, []);
```

This is not a style nitpick — it's a lint error that fails `pnpm lint`. Any
code reading a client-only source of truth (`localStorage`, `navigator`,
`window.matchMedia`, etc.) once on mount should use `useSyncExternalStore`
instead, which has a built-in, mismatch-safe server/client snapshot handoff:

```tsx
function subscribe() {
  return () => {}; // no external event to listen to — value is read once
}

function useIsIOS() {
  return useSyncExternalStore(subscribe, () => /* client check */, () => false);
}
```

Reference implementations already in the repo:

- `src/hooks/use-has-mounted.ts` — generic mount-gate replacement for
  `useEffect(() => setMounted(true), [])`.
- `src/hooks/use-online-status.ts` — subscribes to real `online`/`offline`
  events (a case where `subscribe` does register real listeners).
- `src/components/pwa/install-prompt.tsx` — computes iOS/standalone/dismissed
  state during render (gated by `useHasMounted`) rather than in an effect.

The one thing `useEffect` **is** still the right tool for: subscribing to an
external event and calling `setState` **inside the event callback** (not
directly in the effect body). See the `beforeinstallprompt` listener in
`install-prompt.tsx` for that pattern — it's fine and not flagged.

## Server Actions

Server-only functions live under `src/server/actions/` (shared) or
`src/features/<feature>/server/` (feature-specific), each file starting with
`"use server"`. Call them from client components via `useTransition` for
pending-state UX: form → `startTransition(async () => await action(...))`.

Don't put `"use server"` functions directly inside a client component file —
keep them in their own file under `server/`.

The `squad` feature currently has no backend and needs none — its entire
state machine (auth, KYC, transfers, wallets) is client-side mock state in
`src/features/squad/hooks/use-squad-app.ts`, simulating async steps with
`setTimeout`/`setInterval`. When a real backend is wired up, that's the file
to convert to actually call Server Actions/an API instead of faking delays.

## Environment variables

- Server + client env vars are validated with `zod` in `src/config/env.ts`
  and re-exported as a typed `env` object — import `env` from there instead
  of reading `process.env.X` directly elsewhere in the app.
- Client-exposed vars must be prefixed `NEXT_PUBLIC_` (standard Next.js rule)
  and added to the `clientSchema` in `env.ts`.
- Site-wide constants that aren't secrets (name, description, theme color)
  belong in `src/config/site.ts`, not `env.ts`.

## Package manager

**pnpm only.** Adding a dependency: `pnpm add <pkg>` (runtime) or
`pnpm add -D <pkg>` (dev). Never commit a `package-lock.json` or `yarn.lock`.

## Form events

Use `React.SubmitEvent` for form `onSubmit` handlers (not `React.FormEvent`,
which is marked `@deprecated` in the installed `@types/react` — "doesn't
actually exist" as a real DOM event; `SubmitEvent` is the accurate type for
a `<form>` submit).

## Scripts

- `pnpm dev` — Turbopack dev server.
- `pnpm build` — Turbopack production build (also runs the Serwist SW build).
- `pnpm start` — serve the production build.
- `pnpm lint` — ESLint (must pass with zero errors before considering a
  change done).
- `pnpm typecheck` — `tsc --noEmit`.
