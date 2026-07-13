# Routing & Proxy

## App Router conventions

This repo uses standard Next.js App Router file conventions under `src/app/**`:
`page.tsx`, `layout.tsx`, `route.ts`, metadata routes, and special files such
as `manifest.ts`.

Important app routes in this project:

- `/` -> Stage 1 landing screen for `+216` phone + `@username`
- `/verify` -> Stage 2 6-digit OTP gate
- `/home` -> authenticated dashboard shell
- `/verify-identity` -> Didit launch screen
- `/verify-identity/return` -> post-Didit return/status page
- `/api/didit/session` -> creates a Didit verification session
- `/api/didit/webhook` -> receives Didit webhook status updates
- `/api/qr/mint` -> mints a signed rotating QR payload for the authenticated recipient
- `/api/qr/resolve` -> verifies a signed QR payload and resolves recipient routing preview
- `/api/nearby/publish` -> publishes the current recipient's short nearby code
- `/api/nearby/options` -> loads four nearby code choices for the payer
- `/api/nearby/claim` -> resolves the chosen nearby code into the same signed recipient payload
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
