# Conventions

## `"use client"` boundaries

Default to Server Components. Add `"use client"` only at the component that
actually needs hooks, browser APIs, or local interactive state, and keep that
boundary as low in the tree as practical.

For the authenticated shell specifically, avoid eagerly importing every client
screen into the first bundle. `src/features/mou3amla/components/mou3amla-app.tsx`
now lazy-loads non-home screens with `next/dynamic`; keep that pattern when
adding new screens unless there is a strong reason not to.

## Don't write to a ref during render

The lint config flags `someRef.current = value` inside render. If you need a
ref that mirrors the latest state for timers or async callbacks, update it in
an effect instead. See `src/features/mou3amla/hooks/use-mou3amla-app.ts`.

## Client-only reads: prefer `useSyncExternalStore`

This repo's lint rules reject the classic mount-only pattern:

```tsx
useEffect(() => {
  setSomething(readFromLocalStorageOrNavigator());
}, []);
```

For client-only sources of truth such as `localStorage`, `navigator`, or
`matchMedia`, use `useSyncExternalStore` instead. Existing examples live in
`src/hooks/use-has-mounted.ts`, `src/hooks/use-online-status.ts`, and
`src/features/payments/hooks/use-qr-camera-scanner.ts` (the last one because
`typeof window !== "undefined"` computed inline is `false` during SSR and can
flip to `true` on the very first client render - a hydration mismatch, not
just a stale value).

## Feature hooks: live in the feature, not in a component file

If a component's `useEffect`/`useState` logic does something non-trivial
(an API call, a debounce, a hardware/browser API integration, anything a
future test would want to exercise on its own) it belongs in that feature's
own `hooks/` folder as a named `useXyz` function - not inline in the
component that happens to use it first. `src/features/mou3amla/hooks/**` and
`src/features/payments/hooks/**` are the reference examples.

Only promote a hook to the shared `src/hooks/` if it has **zero
feature-specific coupling** - `use-now.ts` (a plain interval-driven clock) is
the bar to clear. If a hook imports anything from a specific feature, or only
makes sense in that feature's domain, it stays in that feature's `hooks/`,
even if it looks generic at first glance.

Small, purely presentational effects that only exist to drive one component's
own markup (e.g. a scroll-position-to-active-index carousel indicator) don't
need this treatment - extracting every effect regardless of size is its own
kind of clutter. Use judgment: is this logic something another screen, or a
test, would plausibly want to reuse or exercise independently?

## Server Actions

Feature-specific server actions belong under `src/features/<feature>/server/`
with `"use server"` at the top of the file.

For forms, prefer the modern App Router pattern already used in auth:

- client component uses `useActionState(...)`
- form posts directly to the server action
- server action validates with `zod`
- server action redirects on success and returns serializable field errors on
  failure

Do not place `"use server"` functions inside client component files.

### Exception handling, logging, and user-facing errors

Every Server Action that does real work (touches Supabase, calls an
external API) follows the same `xUnsafe` + wrapper split - see
`linkDestination`/`linkDestinationUnsafe` in
`src/features/wallets/server/actions.ts` as the reference:

- The `Unsafe` inner function contains the actual logic and returns a
  typed `{ ok: true, ... } | { ok: false, message }` result (or, for
  `useActionState` forms, an `AuthFormState`-shaped value) for every
  *expected* failure (validation, missing session, not found, conflict).
- The exported wrapper calls it inside a `try/catch`. The `catch` block
  calls `logger.error(...)` (`src/lib/logger.ts` - structured JSON so
  Vercel's log viewer can filter by level/context) with enough context to
  diagnose the failure (user id, the input that triggered it - never a
  secret), then returns the same kind of friendly, generic message the
  expected-failure paths already use. This is what turns "the server
  action throws and the user sees a raw Next.js error overlay" into "the
  user sees the same kind of friendly message either way, and there's a
  greppable log line explaining what actually broke."
- **`redirect()` must never be called inside that `try` block** - per
  Next.js's own docs, `redirect` throws internally and should be called
  **outside** any `try/catch`. Don't reach for `unstable_rethrow` as the
  first instinct here; restructure instead, the way `startPhoneAuth` and
  `finalizeAuth` do in `src/features/auth/server/actions.ts`: the `Unsafe`
  inner function returns `{ redirectTo: string }` instead of calling
  `redirect()` itself, and the exported wrapper calls `redirect()` after
  the `try/catch` has already completed, based on that returned value.
- API routes (`src/app/api/**/route.ts`) get the same safety net for free
  by wrapping the handler in `withRouteErrorHandling`
  (`src/lib/api-handler.ts`) instead of writing this by hand - every route
  under `src/app/api/**` already does this.
- Client-side, a Server Action's `{ ok: false, message }` result is
  surfaced via `toast.error(result.message)` (see `use-wallet-actions.ts`,
  `use-payment-actions.ts`) or a component-local `message` state (see
  `passkey-screen.tsx`, `auth-screen.tsx`'s `AuthFormState.message`) -
  never silently swallowed. `src/app/error.tsx`/`global-error.tsx` are the
  last-resort boundary for anything that still escapes all of the above;
  they already log structured JSON via `console.error` and show a
  friendly retry/home UI, so they don't need to change when you add a new
  feature - just make sure your feature's own actions don't rely on them
  as the primary error path.

## Auth conventions

- The auth flow is **single-entry only**: no separate sign-in and sign-up
  screens.
- Stage 1 collects `phone` and `username` together.
- Stage 2 registers or verifies a **passkey (WebAuthn)** and establishes the
  real session — no OTP, no SMS provider, no stored password.
- New identities: `startPhoneAuth` creates the auth user + profile row, then
  bridges into a session via `admin.auth.admin.generateLink({ type:
  "magiclink" })` + server-side `verifyOtp({ token_hash, type: "magiclink" })`
  (see `establishBridgeSession` in `actions.ts`) purely so `registerPasskey()`
  has an active session to attach the new credential to. The bridge email is
  a synthetic `bridge-<phone>-<handle>@mou3amla.local` address, never shown
  to the user and never used for anything but this handshake.
- Returning identities skip the bridge entirely: `signInWithPasskey()` on the
  browser client performs the full WebAuthn ceremony and creates the session
  directly.
- Passkey support requires `auth: { experimental: { passkey: true } }` on
  both the browser and server Supabase clients
  (`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`), **and**
  passkeys enabled on the Supabase project itself (Dashboard → Authentication)
  with an RP ID/origin matching `NEXT_PUBLIC_APP_URL`. That project-level
  toggle cannot be set from application code.
- After either ceremony succeeds, `finalizeAuth()` cross-checks the
  authenticated session's user against the `phone`/`username` typed on the
  landing screen before redirecting to `/home` — this guards against a
  browser passkey picker resolving to the wrong saved identity.
- `startPhoneAuth` never confirms *which* identity a phone or handle belongs
  to beyond "an account already exists" - only that a partial match exists,
  never the other party's actual phone/handle. Revealing more would let an
  unauthenticated caller enumerate registered phone numbers or handles. The
  three mismatch messages (phone known under a different handle, handle
  taken under a different phone, phone and handle belong to two different
  accounts) are deliberately distinct so a genuine returning user can tell
  what to fix, without leaking someone else's identity.
- Authenticated page gating belongs in server code such as
  `redirectIfAuthenticated()` and `requireCurrentAppUser()`.
- Keep Supabase session/client creation inside `src/lib/supabase/**`.
- Persistent identity data lives in Supabase (`public.profiles`), not in the
  shell reducer.
- Persistent route/payment data lives in Supabase too:
  `linked_destinations`, `payment_transactions`, and `notifications`.

## KYC conventions

- **There is currently no real eKYC provider wired up.** The prior Didit
  integration (hosted session creation, webhook, status polling) was fully
  removed - not paused behind a flag - because the plan is to launch this
  demo to BCT on identity-verification *design*, then integrate a provider
  once one accepted under INPDP is chosen. Do not re-add a specific
  provider's SDK/API calls without discussing which provider first.
- Identity verification is launched only after authentication, from the
  dashboard/profile entry points (`/verify-identity`).
- The only verification path today is the simulated demo flow:
  `VerificationFlowScreen` renders `DemoVerificationPanel`
  (`src/features/onboarding/components/`) whenever
  `user.verificationStatus` is `unverified` or `rejected`. It runs a purely
  client-side simulated step sequence (`useDemoVerification`) with an
  always-visible "Demo mode" banner, then calls the `runDemoVerification`
  server action (`src/features/onboarding/server/actions.ts`).
- `runDemoVerification` sets `verification_status = "verified"` and
  `kyc_provider_status = "Demo Approved"`, and writes a
  `verification_events` row with `source: "demo_kyc"` and a
  provider_status that spells out "simulated" - so this can never be
  confused with a real provider decision in the audit trail a BCT reviewer
  would inspect. **Never make this silent**: `statusMeta` in
  `verification-flow-screen.tsx` and `verificationTone` in
  `profile-screen.tsx` both label a demo-verified profile "(demo)"
  everywhere status is shown, checking `kycProviderStatus === "Demo Approved"`.
  Keep that check when a real provider is eventually added.
- Every status transition is logged to `public.verification_events`
  (previous status, next status, source) inside `runDemoVerification` -
  this is the audit trail a BCT reviewer would ask for under circular
  2025-06 Art. 35-style record-keeping expectations. Do not update
  `profiles.verification_status` from anywhere else without also writing
  an event row.
- 20-digit RIB binding, and *all* wallet/bank destination linking, stays
  locked unless `verificationStatus === "verified"` - enforced server-side in
  `linkDestination` (`src/features/wallets/server/actions.ts`), not just in
  the UI.
- **A `(provider_id, routing_value)` pair is globally exclusive across all
  users**, not just per-user - `linked_destinations_provider_routing_unique`
  is a unique index scoped to the whole table. A RIB or wallet tag belongs to
  one real bank/wallet account, so once user A links it, user B must not be
  able to link the same one. `linkDestination` pre-checks this across all
  users (not just the caller's own rows) to give an accurate message without
  revealing whose account already holds it, with the unique index itself as
  the authoritative race-condition backstop.
- **`linkDestination` is rate-limited per user** (`link-destination:<userId>`,
  10/5min) - a deliberate consequence of the cross-user exclusivity check
  above: without a limit, an authenticated+verified caller could rapidly
  probe arbitrary RIBs/wallet tags and use the "already linked to another
  account" response as an oracle for whether a specific banking identifier
  is registered in Mou3amla. The rate limit is what makes that message safe
  to keep specific rather than vague - don't remove one without
  reconsidering the other.
- **`runDemoVerification` is rate-limited per user** too
  (`demo-verification:<userId>`, 5/5min) for the same defense-in-depth
  consistency, even though abuse impact there is low (it's a no-op once
  `verification_status` is already `"verified"`).
- Do not resurrect the old in-app CIN/selfie capture mock
  (`cin-capture-step.tsx`, `selfie-capture-step.tsx`,
  `setMockVerificationStatus`) - the current `DemoVerificationPanel` is the
  sanctioned replacement: it never claims to check a real document/selfie,
  says so in its own UI copy, and tags every write with `source: "demo_kyc"`.
- **When a real provider is chosen**: add its session-creation/webhook/status
  logic back under `src/features/onboarding/server/`, keep
  `mapProviderStatus`-style logic in one place (don't duplicate the status
  vocabulary mapping across files), keep writing to
  `verification_events` with a distinct `source` value, and gate the choice
  between the demo panel and the real flow explicitly (e.g. an env flag)
  rather than deleting the demo path outright - it's a useful fallback if
  the provider is ever unreachable during a live demo.

## Nearby AirDrop-style handoff (mutual accept)

- This is a **choice presented alongside QR code**, not a replacement for it:
  `HandoffModeToggle` (`src/features/payments/components/handoff-mode-toggle.tsx`)
  switches both `receive-qr-screen.tsx` and `scan-qr-screen.tsx` between a
  `"qr"` and a `"nearby"` mode.
- The nearby flow requires **both sides to explicitly accept** a shared
  3-digit code before the recipient's identity is revealed to the payer:
  `claim` proposes a match (`published` -> `matched`), then each side calls
  `/api/nearby/accept` independently; only once both are accepted does status
  become `confirmed` and `/api/nearby/status` starts returning the recipient.
  Do not shortcut this back to a one-sided reveal.
- Both sides poll `/api/nearby/status` (via `startNearbyMatchPolling` in
  `use-mou3amla-app.ts`) rather than using a push channel - this repo has no
  websocket/realtime infra, and polling matches the existing QR-rotation
  convention. If you need lower latency, reduce `NEARBY_POLL_INTERVAL_MS`
  before reaching for new infra.
- Proximity itself is still simulated via the shared code, not real
  Bluetooth (guardrail #11). The one added sensory cue is
  `navigator.vibrate(...)` on state transitions (matched, then confirmed),
  feature-detected since iOS Safari has no Vibration API - never assume it's
  available.

## Mocked vs. real boundaries in the `mou3amla` shell

Read this before "fixing" something that looks incomplete:

- **Authentication is real now.** Landing, passkey registration/sign-in,
  session cookies, and profile lookup are backed by Supabase.
- **KYC is a visibly-labeled demo, not a real provider integration right
  now.** `DemoVerificationPanel` simulates the document/liveness/face-match
  steps and always says so in its own UI copy - see the KYC conventions
  section above for how it stays distinguishable from a real decision in
  both the UI and the audit trail once a real provider is added.
- **Linked destinations, payment history, and notifications are real now.**
  The home shell hydrates them from Supabase, and payment creation writes back
  to the database before the TUNPAY handoff.
- **The `mou3amla://payment-success?ref=...` callback remains simulated.**
  Mou3amla still does not verify settlement itself.
- **QR tokens** are now server-minted and signed before the scanner can
  resolve recipient data.
- **BLE proximity** is still a visual simulation; web PWAs cannot act as BLE
  advertisers. The current app simulates "nearby" discovery with a short
  server-backed 3-digit handoff code plus signed recipient payloads.
- **`lib/el-fatoora.ts` stamp duty** remains a placeholder until the user
  confirms the current legal amount.

## Shell layout conventions

- In authenticated mobile screens, the header and bottom navigation are both
  fixed shell chrome - always visible, never hiding, resizing, or animating
  on scroll (see [03-pwa.md](./03-pwa.md#mobile-shell-behavior)).
- Only the body content pane should scroll.
- Prefer `src/features/mou3amla/components/screen-frame.tsx` instead of manually
  rebuilding sticky/scroll behavior per screen.

## Environment variables

- Env validation is split across two modules — both must stay in sync, and
  every new var needs a home in one of them:
  - `src/config/env.ts` — `NEXT_PUBLIC_*` vars only. No `server-only` guard,
    because it's safe (and necessary) to import from `"use client"` files,
    e.g. `src/lib/supabase/client.ts`.
  - `src/config/env.server.ts` — secrets (`SUPABASE_SERVICE_ROLE_KEY`,
    `QR_TOKEN_SECRET`, `NODE_ENV`). Guarded with `import "server-only"` so it
    throws if a client bundle ever tries to pull it in, instead of silently
    shipping a secret to the browser (or, as previously happened, throwing at
    module-eval time in the browser because the secret is undefined there).
- Import `env` (client-safe) or `serverEnv` (`env` merged with the secrets)
  from the matching module instead of reading `process.env` directly.
- Never import `env.server.ts` from a file that might end up in a client
  bundle — that includes anything reachable from a `"use client"` component,
  not just files literally marked `"use client"` themselves.
- Client-visible vars must use the `NEXT_PUBLIC_` prefix.
- Current auth-related vars include:
  `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`,
  `QR_TOKEN_SECRET`.
  (No KYC-provider vars exist right now - see KYC conventions above.)

## Package manager

**pnpm only.** Use `pnpm add` / `pnpm add -D` and keep the single `pnpm-lock.yaml`.

## Form events

When you do need an explicit submit handler in React, use `React.SubmitEvent`
instead of `React.FormEvent`.

## Scripts

- `pnpm dev` — Turbopack dev server
- `pnpm build` — Turbopack production build
- `pnpm start` — serve the production build
- `pnpm lint` — ESLint
- `pnpm typecheck` — `tsc --noEmit`
