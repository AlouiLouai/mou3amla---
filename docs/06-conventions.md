# Conventions

## `"use client"` boundaries

Default to Server Components. Add `"use client"` only at the component that
actually needs hooks, browser APIs, or local interactive state, and keep that
boundary as low in the tree as practical.

## Don't write to a ref during render

The lint config flags `someRef.current = value` inside render. If you need a
ref that mirrors the latest state for timers or async callbacks, update it in
an effect instead. See `src/features/squad/hooks/use-squad-app.ts`.

## Client-only reads: prefer `useSyncExternalStore`

This repo's lint rules reject the classic mount-only pattern:

```tsx
useEffect(() => {
  setSomething(readFromLocalStorageOrNavigator());
}, []);
```

For client-only sources of truth such as `localStorage`, `navigator`, or
`matchMedia`, use `useSyncExternalStore` instead. Existing examples live in
`src/hooks/use-has-mounted.ts` and `src/hooks/use-online-status.ts`.

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
- Stage 2 verifies a **6-digit** OTP and establishes the real session.
- In the current MVP, the OTP is intentionally dummy/local: the user still
  experiences a phone-first OTP flow, but no real SMS provider or Supabase
  Phone setup is required.
- Production-like tester deployments can keep that MVP auth rail enabled with
  `DUMMY_PHONE_OTP_ENABLED=true` until a real SMS provider replaces it.
- While the SMS provider is still provisional, the verify screen may surface a
  demo OTP-assist toast that pastes the current 6-digit code and submits it in
  one tap. Treat this as temporary MVP behavior, not production security.
- Authenticated page gating belongs in server code such as
  `redirectIfAuthenticated()` and `requireCurrentAppUser()`.
- Keep Supabase session/client creation inside `src/lib/supabase/**`.
- Persistent identity data lives in Supabase (`public.profiles`), not in the
  shell reducer.
- Persistent route/payment data lives in Supabase too:
  `linked_destinations`, `payment_transactions`, and `notifications`.

## KYC conventions

- Didit is launched only after authentication, from the dashboard/profile
  entry points.
- Keep the local database state `unverified` or `pending` until Didit's
  callback/webhook confirms approval.
- The Didit return page may do a server-side status re-check by
  `didit_session_id`, and the authenticated shell may poll `/api/didit/status`
  while a session is still pending. This improves resilience, but the signed
  webhook remains the long-lived background sync rail.
- 20-digit RIB binding stays locked unless `verificationStatus === "verified"`.
- White-label/brand adjustments for Didit screens are mainly controlled in the
  Didit dashboard, while session launch/webhook handling stays in code.
- Keep `DIDIT_API_KEY` and `DIDIT_WEBHOOK_SECRET` in env. `DIDIT_WORKFLOW_ID`
  is configuration rather than a secret, and the app can read it from env with
  a safe fallback in `src/config/kyc.ts`.

## Mocked vs. real boundaries in the `squad` shell

Read this before "fixing" something that looks incomplete:

- **Authentication is real now.** Landing, OTP, session cookies, and profile
  lookup are backed by Supabase.
- **KYC status is real app state.** Verification status comes from the
  `profiles` table and Didit webhook sync.
- **Linked destinations, payment history, and notifications are real now.**
  The home shell hydrates them from Supabase, and payment creation writes back
  to the database before the TUNPAY handoff.
- **The `mou3amla://payment-success?ref=...` callback remains simulated.**
  SQUAD still does not verify settlement itself.
- **QR tokens** are now server-minted and signed before the scanner can
  resolve recipient data.
- **BLE proximity** is still a visual simulation; web PWAs cannot act as BLE
  advertisers. The current app simulates "nearby" discovery with a short
  server-backed 3-digit handoff code plus signed recipient payloads.
- **`lib/el-fatoora.ts` stamp duty** remains a placeholder until the user
  confirms the current legal amount.

## Environment variables

- Validate env vars centrally in `src/config/env.ts`.
- Import `env` from that module instead of reading `process.env` directly.
- Client-visible vars must use the `NEXT_PUBLIC_` prefix.
- Current auth/KYC-related vars include:
  `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`,
  `DUMMY_PHONE_OTP_ENABLED`,
  `QR_TOKEN_SECRET`,
  `DIDIT_API_KEY`,
  `DIDIT_WORKFLOW_ID`,
  `DIDIT_WEBHOOK_SECRET`.

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
