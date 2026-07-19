# Routing & Proxy

## App Router conventions

This repo uses standard Next.js App Router file conventions under `src/app/**`:
`page.tsx`, `layout.tsx`, `route.ts`, metadata routes, and special files such
as `manifest.ts`.

Important app routes in this project:

- `/` -> Stage 1 landing screen for `+216` phone + `@username`
- `/verify` -> Stage 2 passkey (WebAuthn) gate
- `/home` -> authenticated dashboard shell
- `/payments/return/[provider]` -> authenticated provider-checkout return landing page; verifies the provider result server-side, finalizes the transaction, then redirects back into `/home?payment_ref=...`
- `/verify-identity` -> identity verification entry screen (demo KYC flow only, see [06-conventions.md](./06-conventions.md#kyc-conventions))
- `/api/qr/mint` -> mints a signed rotating QR payload for the authenticated recipient
- `/api/qr/resolve` -> verifies a signed QR payload and resolves recipient routing preview
- `/api/nearby/publish` -> publishes/refreshes the current recipient's short nearby code
- `/api/nearby/options` -> loads four nearby code choices (only genuinely `published` ones) for the payer
- `/api/nearby/claim` -> proposes a match on a chosen nearby code (does **not** reveal the recipient yet)
- `/api/nearby/status` -> polled by both sides of a nearby match to read/react to status changes
- `/api/nearby/accept` -> either side accepts the match; recipient is only revealed once both have
- `/api/users/search` -> recipient username typeahead for the send screen (own admin-client query, since RLS only allows reading your own profile row)
- `/api/payments/providers/flouci/webhook` -> Flouci checkout webhook finalizer
- `/api/payments/providers/konnect/webhook` -> Konnect checkout webhook finalizer
- `/auth/logout` -> destroys the Supabase session
- `/~offline` -> offline fallback
- `/serwist/[path]` -> service worker build/serve route

Keep route files thin. They should read session state, call server helpers,
and render/redirect, not accumulate business logic.

## `proxy.ts`, not `middleware.ts`

This repo intentionally uses `src/proxy.ts`, not `middleware.ts`. Next.js 16
renamed the convention; do not create both files.

## What `src/proxy.ts` does

- Refreshes the Supabase SSR session using `src/lib/supabase/proxy.ts`
- Sets `x-request-id` and `x-pathname` response headers
- Uses a matcher that skips Next internals, the service worker route, the
  manifest, and static asset extensions

The proxy is a **network boundary**, not the app's source of truth for access
control. Protected pages and handlers must still re-check auth in their own
server code.

## Rules for editing it

- Keep it thin and fast.
- Do not put slow data fetching or authorization business logic there.
- If you change the matcher, verify you did not accidentally exclude auth or
  app routes that depend on session refresh.
- If a route needs protection, enforce that in the page, Server Action, or
  route handler as well.
