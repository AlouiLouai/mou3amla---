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

- Identity verification is launched only after authentication, from the
  dashboard/profile entry points (`/verify-identity`).
- Verification is real, via Didit's hosted eKYC flow, not an in-app mock:
  `POST /api/didit/session` creates a Didit v3 session (`workflow_id` from
  `DIDIT_KYC_WORKFLOW_ID` in `src/config/kyc.ts`) and redirects the user to
  Didit's own hosted capture/liveness/face-match UI. Mou3amla never captures or
  stores CIN photos or selfies itself.
- Didit redirects back to `/verify-identity/return`, which re-syncs status via
  `syncDiditSessionStatus`. The webhook at `/api/didit/webhook` is the
  background source of truth regardless of whether the user's browser makes
  it back to the return page.
- **Webhook signature verification uses only Didit's documented
  `X-Signature-V2` scheme** (HMAC-SHA256 over a canonical JSON form: sorted
  keys, compact separators, unescaped Unicode) plus a 5-minute
  `X-Timestamp` replay window. Do not accept any other signature header or
  reintroduce a multi-scheme fallback - that was tried before and is exactly
  what made the integration unreliable enough to get reverted once already.
- `mapDiditStatus` in `src/features/onboarding/server/didit.ts` is the single
  place that maps Didit's status vocabulary (`Approved`, `Declined`,
  `Expired`, `Abandoned`, `Kyc Expired`, `In Review`, ...) to
  `profiles.verification_status`. Don't duplicate that mapping elsewhere.
- Every status transition is logged to `public.verification_events`
  (previous status, next status, source, Didit session id) inside
  `updateProfileStatus` - this is the audit trail a BCT reviewer would ask
  for under circular 2025-06 Art. 35-style record-keeping expectations. Do
  not update `profiles.verification_status` from anywhere else without also
  writing an event row.
- The webhook route claims each `event_id` against `public.didit_webhook_events`
  (`claimWebhookEvent` in `didit.ts`) before doing any work - Didit retries an
  undelivered webhook up to twice (5xx/404), and this makes a retry a no-op
  instead of a reprocess. A verified payload with no `status` field (e.g.
  `data.updated`, `activity.created`, business/transaction events this app
  doesn't act on) gets a quick `200` acknowledgement, not a `401` - a `401`
  is reserved for an actual signature failure, since Didit will keep retrying
  anything that doesn't come back `2xx`.
- `updateProfileStatus` also guards against a retried webhook arriving *after*
  a newer one already landed: it compares the payload's `timestamp`/`created_at`
  against `profiles.didit_status_event_at` and no-ops if the incoming event is
  older. This guard only applies to webhook deliveries - a direct status poll
  (`syncDiditSessionStatus`) has no event timestamp and always applies, since
  it's reading Didit's current truth directly rather than replaying a queued
  delivery.
- `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET` are optional in
  `src/config/env.server.ts` - when `DIDIT_API_KEY` is unset, session creation
  and status polling short-circuit gracefully instead of throwing.
- 20-digit RIB binding, and now *all* wallet/bank destination linking, stays
  locked unless `verificationStatus === "verified"` - enforced server-side in
  `linkDestination` (`src/features/wallets/server/actions.ts`), not just in
  the UI.
- Do not resurrect the old in-app CIN/selfie capture mock
  (`cin-capture-step.tsx`, `selfie-capture-step.tsx`,
  `setMockVerificationStatus`) - it was deliberately removed in favor of the
  real Didit integration.
- **`KYC_DEMO_MODE` is the sanctioned, visibly-labeled stand-in** for when
  Didit is unreachable (credits exhausted, no INPDP-cleared provider chosen
  yet, demoing to BCT before a provider is finalized). When
  `serverEnv.KYC_DEMO_MODE` is `true`:
  - `VerificationFlowScreen` renders `DemoVerificationPanel` instead of the
    "Continue with Didit" form - it runs a purely client-side simulated
    step sequence (`useDemoVerification`) with an always-visible "Demo mode"
    banner, then calls the `runDemoVerification` server action
    (`src/features/onboarding/server/actions.ts`).
  - `runDemoVerification` re-checks `KYC_DEMO_MODE` server-side before doing
    anything (defense-in-depth against the flag flipping off mid-flight or
    the action being invoked directly), then sets
    `verification_status = "verified"` and `didit_latest_status =
    "Demo Approved"`, and writes a `verification_events` row with
    `source: "demo_kyc"` and a provider_status that spells out "simulated" -
    so this can never be confused with a real Didit decision in the audit
    trail a BCT reviewer would inspect.
  - `POST /api/didit/session` redirects straight back to `/verify-identity`
    without calling Didit at all while demo mode is on, even if someone
    bypasses the UI.
  - This is never silent: `statusMeta` in `verification-flow-screen.tsx`
    labels a demo-verified profile "Verified (demo)" with body copy stating
    it's simulated, everywhere that status is shown.

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
- **KYC is real via Didit when `KYC_DEMO_MODE` is off** (the default).
  Verification status in the `profiles` table is driven by an actual hosted
  eKYC session (document capture, liveness, face-match), not a local mock or
  self-attestation toggle. When `KYC_DEMO_MODE=true`, a visibly-labeled demo
  flow (`DemoVerificationPanel`) stands in instead - see "Do not resurrect
  the old in-app CIN/selfie capture mock" under KYC conventions above for
  why this exists and how it stays distinguishable from a real decision.
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
- Current auth/KYC-related vars include:
  `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`,
  `QR_TOKEN_SECRET`,
  `DIDIT_API_KEY`,
  `DIDIT_WORKFLOW_ID`,
  `DIDIT_WEBHOOK_SECRET`,
  `KYC_DEMO_MODE`.

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
