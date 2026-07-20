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
- **Passkeys are self-hosted, not Supabase's native passkey feature.**
  Supabase's experimental `registerPasskey()`/`signInWithPasskey()` API
  reliably returned `AuthApiError: Credential verification failed` even
  with a correctly configured Relying Party (verified against the Dashboard
  settings) - a bug/limitation in that experimental feature, not fixable
  from application code. Registration and authentication are implemented
  with `@simplewebauthn/server` (`src/features/auth/server/webauthn.ts`)
  and `@simplewebauthn/browser` (`startRegistration`/`startAuthentication`
  in `passkey-screen.tsx`), with credentials stored in `public.passkeys`
  (our own table) rather than `auth.webauthn_credentials`. Do not switch
  back to Supabase's native passkey API without first confirming Supabase
  has actually fixed the underlying verification bug.
- The Relying Party ID/origin are derived from `NEXT_PUBLIC_APP_URL`
  (`getRpConfig()` in `webauthn.ts`), not a Supabase Dashboard toggle - one
  less moving part outside this codebase's control. Note RP ID is a single
  bare domain and origins must be that domain or a subdomain of it, so
  `localhost` (dev) and a real deployed domain (prod) can never both work
  under the same RP config - `NEXT_PUBLIC_APP_URL` must match wherever
  you're actually testing. In local development specifically, verification
  also tolerates the live loopback request origin (`localhost` /
  `127.0.0.1`) when only the **port** differs from the configured dev URL,
  which avoids false negatives when the browser is actually running on
  `http://localhost:3001` while the env file still says
  `http://localhost:3000`. Production stays pinned to the configured origin.
- The registration/authentication ceremony is two round trips around one
  browser-side `navigator.credentials.create()`/`.get()` call: `get*Options`
  (`getPasskeyRegistrationOptions`/`getPasskeyAuthenticationOptions` in
  `actions.ts`) generates a challenge and stores it in a short-lived httpOnly
  cookie (`setChallengeCookie`, `passkey-bridge.ts`), then
  `verifyPasskeyRegistration`/`verifyPasskeyAuthentication` reads that same
  cookie back to verify the browser's response.
- Every passkey action **re-resolves the profile from the exact
  (phone, username) pair** (`resolveExactProfile` in `actions.ts`) rather
  than trusting a client-supplied id - this is also what scopes
  `allowCredentials`/`excludeCredentials` to only that profile's own rows,
  so there's no discoverable-credential ambiguity to guard against
  separately (the old Supabase-native flow needed a post-hoc identity
  cross-check for exactly this reason; this design doesn't).
- Once our own WebAuthn verification succeeds (register or authenticate),
  `mintSessionForIdentity()` opens the real Supabase session via
  `admin.auth.admin.generateLink({ type: "magiclink" })` + server-side
  `verifyOtp({ token_hash, type: "magiclink" })` against the synthetic
  `bridge-<phone>-<handle>@mou3amla.local` address created at registration
  time. This part of the old design was never the problem - only Supabase's
  native passkey verify endpoint was - so it's reused as-is, now called
  *after* verification instead of before it (the old design opened this
  session first so `registerPasskey()` would have something to attach a
  credential to; self-hosting the credential storage means we no longer need
  a session before verifying, which also closes a real gap the old design
  had: a session opened before verification stayed valid even if the
  passkey step then failed).
- WebAuthn ceremony failures happen entirely client-side and never otherwise
  reach server logs - `logPasskeyCeremonyFailure(mode, detail)` in
  `actions.ts` exists purely so a real error ends up somewhere greppable.
  Call it from the client on every `startRegistration`/`startAuthentication`
  catch.
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

## Payments conventions

- `createPaymentIntent` (`src/features/payments/server/actions.ts`) is
  rate-limited per user (`create-payment-intent:<userId>`, 20/5min) and
  follows the `xUnsafe` + try/catch-logging pattern - see "Exception
  handling..." above.
- `generateRefId()` (`src/features/payments/lib/tunpay.ts`) uses
  `crypto.randomUUID()` (the global Web Crypto API, not `node:crypto` -
  this file is imported from both client components and the server action,
  so it must stay isomorphic). It used to use `Math.random()`, which was
  both weak and a real collision risk against `payment_transactions.ref_id`'s
  unique constraint - don't reintroduce a non-cryptographic ID generator for
  anything that ends up as a unique, user-facing payment reference.
- **Duplicate-submission guard**: before inserting, `createPaymentIntentUnsafe`
  looks for an existing `payment_transactions` row from the same
  (sender, destination, recipient, amount) tuple created within the last
  `DUPLICATE_SUBMIT_WINDOW_MS` (10s) and reuses it instead of writing a
  second row + a second pair of notifications - a double-tap or a
  slow-network retry from the send screen is otherwise indistinguishable
  from two separate intentional sends. This is a same-request dedupe, not a
  client-supplied idempotency key - fine for Mou3amla's zero-liability model
  (see "Mocked vs. real boundaries" below), but a real TUNPAY handoff that
  can actually move money would want a proper client-generated idempotency
  key instead of a time-window heuristic.
- `payment_transactions`/`notifications` inserts are unit-tested in
  `src/features/payments/server/actions.test.ts` - covering validation,
  session/rate-limit checks, self-transfer and unverified-recipient
  rejection, missing-destination rejection, the success path, and that a
  failed notification insert doesn't fail the whole payment (the transaction
  already committed by that point).
- **Payment notifications are delivered over Supabase Realtime, with a
  durable polling fallback, not just on next page load.**
  `useRealtimeNotifications`
  (`src/features/notifications/hooks/use-realtime-notifications.ts`)
  subscribes to `postgres_changes` INSERT events on `public.notifications`
  filtered to the current user - enabled via `alter publication
  supabase_realtime add table public.notifications;` (migration
  `20260718170000_enable_realtime_notifications.sql`). This relies on the
  existing `notifications_select_own` RLS policy for scoping - Realtime
  enforces the same RLS as the REST API, so a client can't construct a
  filter to see anyone else's notifications. Wired into
  `use-mou3amla-app.ts`; a `payment_received` notification also triggers a
  toast. The same hook also polls the recent notification rows every few
  seconds as a backstop, so a receiver still auto-jumps to Activity if their
  browser misses the websocket insert entirely (for example, a transient local
  dev websocket hiccup or an unapplied Realtime-publication migration in a
  demo database). In the current internal-mock-checkout demo flow, that
  notification is intentionally emitted only once the mock checkout is
  explicitly simulated as **success**, not at intent creation time, so the
  receiver only auto-jumps to Activity once the demo operator confirms the
  payment. Requires
  `Mou3amlaState.profile.id` (threaded through from `requireCurrentAppUser()`
  via `InitialMou3amlaUser`/`UserProfile`) - if you see the subscription
  silently not firing, check that `id` actually made it into `initialUser` in
  `src/app/home/page.tsx`.
- **Internal mock checkout is the current demo handoff shape for send-money.**
  `createPaymentIntent` now creates the durable Mou3amla transaction row
  first, then creates a Mou3amla-owned `/dev/mock-checkout` session server-side
  for the selected source rail. Flouci and Konnect are intentionally disabled
  for new linking with a visible service-down state; the other linked rails can
  launch the internal mock screen instead. The shell therefore tracks two
  separate concepts on purpose: `sourceWalletId` remains the user's default
  *receive* route (`linked_destinations.is_default` in Supabase), while the
  client-only `sendSourceWalletId` is just the currently chosen source rail for
  the mock checkout screen.
- **The mock checkout must stay obviously internal.** `/dev/mock-checkout`
  shows a persistent `DEVELOPMENT MOCK ENVIRONMENT - NO REAL MONEY MOVED`
  banner, Mou3amla-native styling, sender/receiver/amount details, and
  explicit success/failure simulation controls. Do not clone a third-party
  payment brand's exact checkout visuals or wording inside this route.
- **Linked-destination deletion is an authenticated, rate-limited write path.**
  `deleteDestination` in `src/features/wallets/server/actions.ts` follows the
  same audit bar as linking and send-money: session check, per-user rate limit
  (`delete-destination:<userId>`, 10/5min), ownership enforcement, wrapper
  error logging, and unit coverage. If the deleted row was the default receive
  route, the next remaining linked destination is promoted immediately; the
  Accounts screen always asks for an explicit second confirmation before
  removing a wallet or bank account from Mou3amla.
- **Provider finalization is server-verified and idempotent.** Browser return
  pages live under `/payments/return/[provider]`; webhook endpoints live under
  `/api/payments/providers/**`; both go through the same server-side verify +
  finalize path (`provider-returns.ts` / `transaction-finalization.ts`). The
  browser never decides success/failure on its own from a query string alone;
  it always re-checks with the provider API before updating
  `payment_transactions.status`.

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
- **Both sides get status/accept updates over Supabase Realtime, not a
  poll.** `startNearbyRealtime` (`use-qr-nearby-actions.ts`) subscribes to
  `postgres_changes` UPDATE and DELETE events on `public.nearby_handoffs`,
  filtered separately by `owner_user_id=eq.<me>` and `payer_user_id=eq.<me>`
  (a participant can be either, and Postgres Changes filters are single-column
  equality, so it takes two `.on()` registrations on one channel rather than
  one `OR` filter). Enabled via `alter publication supabase_realtime add
  table public.nearby_handoffs` plus a `nearby_handoffs_select_participant`
  RLS policy (migration `20260719130000_profiles_column_grants_and_nearby_realtime.sql`).
  DELETE events need `replica identity full` on the table (migration
  `20260719130100_nearby_handoffs_replica_identity_full.sql`) - the default
  replica identity only includes the primary key in a delete's old-row
  image, which isn't enough for Realtime to evaluate the
  owner_user_id/payer_user_id filter, so a cancel would otherwise never
  reach the other participant.
  - The raw row carries no recipient identity - `buildNearbyMatchPayload`
    still resolves and returns the counterparty's profile server-side, only
    once `status` is `"confirmed"`. Don't add a column to
    `nearby_handoffs` that would leak identity pre-reveal: this table now
    ships to a Realtime broadcast, and column-level SELECT grants do **not**
    protect against that (logical replication ships the whole physical row,
    independent of PostgREST grants) - `signed_token` used to be exactly
    this kind of leak (a signed-but-not-encrypted JWT-like token embedding
    the owner's userId + username, write-only and never actually read by
    anything) and was removed for that reason.
  - Realtime only fires on a write. A match nobody acts on just goes stale
    past its own `expiresAt` with no event at all - the owner side self-heals
    within `QR_TOKEN_TTL_MS` via its own publish rotation, but the payer has
    no equivalent, so `expirePayerMatch` + a client-side `setTimeout` in
    `scan-qr-screen.tsx` is what recovers a payer stuck on a gone-stale match.
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
  server-backed 3-digit handoff code, with recipient identity resolved and
  returned server-side only after both sides mutually accept.
- **`lib/el-fatoora.ts` stamp duty** remains a placeholder until the user
  confirms the current legal amount.
- **Invoices are derived, not separately persisted.** `getCurrentAppUser`
  (`src/features/auth/server/dal.ts`) computes the current user's `invoices`
  from their own sent `payment_transactions` rows (already fetched for
  `activityLog`) rather than reading from a dedicated table - so they survive
  a page reload without needing new schema. There is currently no way for an
  account to actually become "Mode Professionnel" (`UserProfile.isProfessional`
  is hardcoded `false` in `reducer.ts` and nothing ever flips it) - the
  Invoices screen is reachable from the bottom nav regardless and will show
  real, durable invoice data once it has any sent transactions, but the
  professional-mode gate itself is unwired. Don't build on the assumption
  that `isProfessional` reflects anything real until that's addressed.

## Security hardening

- **Rate limiting covers every abuse-prone route, not just send-money.**
  `/api/nearby/claim` (8/30s per user), `/api/nearby/accept` (20/60s per
  user), and `/api/qr/mint` (15/60s per user) all call `checkRateLimit`
  (`src/lib/rate-limit.ts`), same as `createPaymentIntent` and
  `/api/users/search`. `claim` in particular guards a 3-digit (000-999)
  challenge code - without a tight per-user cap, a script could exhaust the
  whole keyspace well inside the code's own TTL. New abuse-prone routes
  (anything that mutates state, resolves identity, or is cheap to call
  repeatedly) should get a `checkRateLimit` call before doing real work -
  see guardrail #19 in
  [07-agent-guardrails.md](./07-agent-guardrails.md).
- **RLS restricts rows; column-level GRANTs restrict columns - both matter.**
  `profiles_update_own` (RLS) only checks `auth.uid() = id`, saying nothing
  about *which* columns a signed-in user could set. Supabase's default
  project privileges grant table-wide UPDATE to `authenticated`, so without
  an explicit column grant, any signed-in user could call PostgREST directly
  (`PATCH /rest/v1/profiles?id=eq.<own-id>` with
  `{"verification_status":"verified"}`) and self-approve their own KYC -
  bypassing the entire demo verification flow, using nothing but the public
  anon key and their own session. Migration
  `20260719130000_profiles_column_grants_and_nearby_realtime.sql` revokes
  table-wide UPDATE on `public.profiles` from `authenticated` and grants it
  back only for `display_name`. The app itself never writes to `profiles`
  this way (every write goes through the service-role admin client), so this
  is pure hardening with no behavior change - if you ever add a
  self-service profile edit that needs a new column writable by the user
  directly, extend the column grant explicitly rather than reverting to a
  blanket `grant update on public.profiles`.
- **`src/lib/logger.ts` redacts by key, not by value.** Any context key
  matching phone/routing_value/rib/credential/public_key/challenge/token/
  secret/password (case-insensitive substring) gets replaced with
  `"[redacted]"` before the line is emitted, recursively through nested
  objects/arrays. This is deliberately broad (it'll redact things like a
  WebAuthn `credentialId` that aren't secrets, just to be safe) - the
  intent is that no future log call can accidentally leak PII/routing data
  just by including it in a context object, without needing every call site
  to remember to redact it manually. See `src/lib/logger.test.ts`.
- **`next.config.ts` sets a Content-Security-Policy** (in addition to the
  pre-existing `X-Content-Type-Options`/`X-Frame-Options`/`Referrer-Policy`).
  It's the non-nonce variant (`script-src`/`style-src` include
  `'unsafe-inline'`) rather than a `proxy.ts`-issued per-request nonce,
  because nonce-based CSP requires forcing every page into dynamic
  rendering - a bigger structural change than this demo-stage app's CSP
  warrants right now. `connect-src` explicitly allow-lists the Supabase
  project host (`https://*.supabase.co` and `wss://*.supabase.co`) so the
  browser client (auth, Realtime websockets) isn't blocked. If a future
  need for a stricter `script-src` (no `'unsafe-inline'`) comes up, follow
  Next's own nonce guide
  (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`)
  rather than hand-rolling it.

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
  `QR_TOKEN_SECRET`,
  `KONNECT_API_KEY`,
  `KONNECT_RECEIVER_WALLET_ID`,
  `KONNECT_API_BASE_URL`,
  `FLOUCI_PUBLIC_KEY`,
  `FLOUCI_PRIVATE_KEY`,
  `FLOUCI_API_BASE_URL`.
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
