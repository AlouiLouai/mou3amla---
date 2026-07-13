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

The `squad` feature currently has no backend and needs none by design — it's
a zero-liability router, not a custodial wallet. Its entire state machine
(auth, onboarding, wallet registry, payment intents) is client-side mock
state in `src/features/squad/hooks/use-squad-app.ts`, simulating async steps
with `setTimeout`/`setInterval`. See the next section for exactly what's
mocked vs. real.

## Mocked vs. real boundaries in the `squad` feature

Read this before "fixing" something that looks incomplete — several things
are **intentionally** simulated for this prototype, not bugs:

- **The account switcher** (`account-switcher-sheet.tsx`, `AccountId` in
  `types.ts`, `SquadState.accounts`/`activeAccountId` in `use-squad-app.ts`)
  is a demo-only affordance. In production there is exactly **one** SQUAD
  identity per person — "switching accounts" is not a real feature to build
  out further. It exists so this prototype can demo a genuine two-sided
  payment (switch to the pre-seeded "ahmed" persona, send from "me", switch
  back, watch it land) in one browser tab without a second device or a
  backend. `generateIntent` checks whether the typed recipient matches the
  *other* seeded account's username and, if so, writes a matching "receive"
  entry (and invoice, if they're a pro account) directly into that other
  account's slice — that cross-account write only happens because both
  personas live in client state together for the demo; a real backend
  wouldn't need this, the recipient's own server would create their side.
- **OTP verification** (`otp-screen.tsx` / `verifyOtp` in `use-squad-app.ts`)
  accepts any 4-digit code. There's a `// TODO(server-action)` marker where a
  real Twilio Verify (or local SMS provider) call would go. Required env vars
  once that's wired up: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `TWILIO_VERIFY_SERVICE_SID` (add to `src/config/env.ts` following the
  existing zod pattern — don't read `process.env` directly).
- **The `mou3amla://payment-success?ref=...` callback** (this app's own
  hand-off-complete scheme) is simulated with a `setTimeout` in
  `generateIntent` — in reality this fires from the user's own banking app
  after *it* completes the transfer. SQUAD never confirms fund movement
  itself; don't add code that treats the simulated timeout as if SQUAD
  verified anything.
- **QR tokens** (`lib/qr-token.ts`) are a base64 JSON blob with an expiry
  window — good enough to demo the 60s-rotation UX, but **not** real
  cryptographic replay protection. Real tamper-proofing needs the token
  minted and signed server-side. Don't describe this as "cryptographic" in
  UI copy or docs.
- **BLE proximity** (`receive-qr-screen.tsx`'s pulse-ring indicator) is a
  pure visual simulation. Actual BLE peripheral/advertiser mode is not
  achievable from a browser or installed PWA (Web Bluetooth only supports
  the "central"/scanning role) — it needs a native app. Don't attempt to
  wire real `navigator.bluetooth` peripheral APIs into this repo; there
  aren't any that would work. See [07-agent-guardrails.md](./07-agent-guardrails.md).
- **`lib/el-fatoora.ts`'s stamp duty** (`PLACEHOLDER_STAMP_DUTY_TND`) is an
  illustrative flat placeholder, not a verified current Tunisian tax figure.
  Don't "correct" it to a different specific number without the user
  confirming the current Finance Law/BCT circular rate first.
- **`lib/deep-link.ts`'s `attemptNativeHandoff`** navigates a **hidden
  iframe** (not the top-level page) to the custom-scheme URL and is
  fire-and-forget — there's no standardized web API for "did a native app
  intercept this." It deliberately does **not** auto-redirect the top-level
  page to the web gateway on a timeout: setting `window.location.href`
  directly to an unregistered scheme, or force-navigating away after a
  guessed timeout, can strand the user on a browser error page (confirmed
  while testing this in headless Chromium — the installed PWA's own tab went
  blank, and `gateway.mou3amla.tn` isn't a real deployed service yet anyway).
  Instead, `intent-result-screen.tsx` shows a visible "continue via gateway"
  link (opens in a new tab) the user can tap if the native app didn't open.
  Don't "simplify" this back to an automatic `location.href` redirect.
- **The "Regulatory Sandbox Pilot" disclosure** (auth-screen badge + footer
  copy, and the fuller card on `profile-screen.tsx`) is not filler copy —
  it's grounded in §4.3 of BCT's actual *Guide d'accès à la Sandbox
  Réglementaire* (Jan 2020), which requires clear written communication to
  volunteer test clients about the test's purpose and risks. That PDF has no
  UI/design guidance beyond this; don't attribute other design choices to it.

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
