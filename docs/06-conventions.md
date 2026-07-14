# Conventions

## `"use client"` boundaries

Default to Server Components. Add `"use client"` only at the component that
actually needs hooks, browser APIs, or local interactive state, and keep that
boundary as low in the tree as practical.

For the authenticated shell specifically, avoid eagerly importing every client
screen into the first bundle. `src/features/squad/components/squad-app.tsx`
now lazy-loads non-home screens with `next/dynamic`; keep that pattern when
adding new screens unless there is a strong reason not to.

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

- Identity verification is launched only after authentication, from the
  dashboard/profile entry points.
- Capture is real, the decision is mocked: `src/features/onboarding/components/cin-capture-step.tsx`
  captures the CIN front/back via a plain `<input type="file" accept="image/*">`
  (no `capture` attribute, so mobile browsers offer both the camera and the
  photo library) and `selfie-capture-step.tsx` drives a live `getUserMedia`
  selfie with an oval guide that auto-snapshots once a face is aligned
  (`FaceDetector` API where supported, a timed fallback otherwise). No image
  quality/OCR validation happens — any captured photo is accepted.
- The face-match "comparison" between the CIN photo and the selfie is
  simulated client-side (a short delay, then success) — there is no real
  biometric matching. Do not add one without the user asking for a real KYC
  provider.
- Captured photos are never uploaded or persisted: they live only in browser
  memory (`URL.createObjectURL` / canvas `dataURL`) for the duration of the
  flow and are revoked/discarded on retake or unmount. Do not add a Supabase
  Storage bucket for these without the user explicitly asking for photo
  retention.
- Keep the local database state `unverified`, `pending`, `verified`, or
  `rejected` in `profiles.verification_status`; the mock flow writes that value
  directly via `setMockVerificationStatus` in
  `src/features/onboarding/server/actions.ts`.
- 20-digit RIB binding stays locked unless `verificationStatus === "verified"`.
- Keep the verification flow SQUAD-branded and local until the user asks for a
  real KYC provider integration.

## Mocked vs. real boundaries in the `squad` shell

Read this before "fixing" something that looks incomplete:

- **Authentication is real now.** Landing, OTP, session cookies, and profile
  lookup are backed by Supabase.
- **KYC status is real app state.** Verification status comes from the
  `profiles` table even though the current UI is a local mock flow.
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

## Shell layout conventions

- In authenticated mobile screens, the header is fixed shell chrome and the
  bottom navigation floats over the content pane, auto-hiding on scroll-down
  and reappearing on scroll-up (see [03-pwa.md](./03-pwa.md#mobile-shell-behavior)).
- Only the body content pane should scroll.
- Prefer `src/features/squad/components/screen-frame.tsx` instead of manually
  rebuilding sticky/scroll behavior per screen.

## Environment variables

- Validate env vars centrally in `src/config/env.ts`.
- Import `env` from that module instead of reading `process.env` directly.
- Client-visible vars must use the `NEXT_PUBLIC_` prefix.
- Current auth/KYC-related vars include:
  `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`,
  `DUMMY_PHONE_OTP_ENABLED`,
  `QR_TOKEN_SECRET`.

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
