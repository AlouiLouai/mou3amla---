# Agent Guardrails

Read this before making changes. It is the condensed list of stack-specific
rules most likely to be broken by stale training data or over-eager refactors.

## Hard rules

1. **Use pnpm only.** Never introduce `npm` or `yarn` workflows.
2. **Never create `middleware.ts`.** This app uses `src/proxy.ts`.
3. **Never add webpack-only config expecting it to run.** The build is
   Turbopack-only.
4. **Never swap in `next-pwa` or `@serwist/next`.** PWA integration must stay
   on `@serwist/turbopack`.
5. **Do not reintroduce `useEffect(() => setState(...), [])` for one-time
   client-only reads.** Use `useSyncExternalStore`.
6. **Do not add a global state library or speculative service/repository
   layer** unless the user explicitly asks for that architectural change.
7. **New domain code goes in `src/features/<name>/`.** Shared UI goes in
   `src/components/**`; shared framework helpers go in `src/lib/**` or
   `src/hooks/**`.
8. **Manifest icons are generated routes, not static files in `public/`.**
9. **`app/manifest.ts` serves `/manifest.webmanifest`.**
10. **shadcn primitives come from the CLI**, not hand-written approximations.
11. **Never implement real BLE advertiser/peripheral behavior in this repo.**
    The web platform cannot do that from a browser/PWA.
12. **Never invent Tunisian tax/regulatory values.** Placeholder values stay
    placeholders until the user confirms them.
13. **Mou3amla is zero-liability by design.** Do not add balances, stored bank
    credentials, or balance-fetching behavior.
14. **Do not split auth into separate sign-in/sign-up screens unless the user
    explicitly changes the product requirement.** The current architecture is a
    unified phone + username landing flow.
15. **Do not bypass `src/config/env.ts`.** New env vars must be validated
    there before use.
16. **Supabase schema changes must land in migrations.** Do not leave durable
    database changes implied only in app code.
17. **Identity verification is post-auth.** Do not gate the initial passkey
    login on CIN/selfie completion; KYC unlocks higher-trust features
    afterward.
18. **`server-only` throws in any test** unless `vitest.setup.ts` mocks it
    (see [08-testing.md](./08-testing.md)). If a test suddenly can't import a
    server module, fix the mock - don't reach for a `@vitest-environment`
    pragma or `resolve.conditions`, neither actually fixes it.
19. **New authenticated write server actions/routes need the same audit bar
    as auth, KYC, and wallet linking already passed** (see
    [06-conventions.md](./06-conventions.md)) before calling a ticket done:
    - Auth-gated (reject with a clear message if no session).
    - Rate-limited per user (or per IP pre-auth) - `checkRateLimit` from
      `src/lib/rate-limit.ts`, following the `<action>:<userId or ip>` key
      convention already used by `startPhoneAuth`, `linkDestination`, and
      `runDemoVerification`.
    - Error messages never leak another user's identity/data beyond
      confirming "a conflict exists" - see the phone/username mismatch
      messages in `actions.ts` and the cross-user destination-exclusivity
      message in `wallets/server/actions.ts` for the pattern.
    - Has unit tests covering: missing session, validation failures, the
      main success path, and whatever conflict/exclusivity check exists -
      `src/features/wallets/server/actions.test.ts` is the reference shape.
    - Wrapped in the `xUnsafe` + try/catch-logging outer function pattern so
      an unexpected error never throws past a Server Action boundary - see
      "Exception handling, logging, and user-facing errors" in
      [06-conventions.md](./06-conventions.md#server-actions).
20. **Never put `redirect()` inside a `try/catch` block.** It throws
    internally to interrupt rendering, and Next.js's own docs say it must
    be called outside any `try`. When a Server Action needs both
    error-catching *and* a redirect (auth's `startPhoneAuth`/`finalizeAuth`
    are the reference), have the inner `Unsafe` function return
    `{ redirectTo: string }` instead of calling `redirect()` itself, and
    call `redirect()` in the exported wrapper after the `try/catch` has
    already run - don't reach for `unstable_rethrow` as a first instinct.
21. **Every new `public.*` table needs its `anon`/`authenticated` write
    grants explicitly revoked unless the table genuinely has correctly-scoped
    self-service RLS policies for every command it grants.** Supabase grants
    table-wide INSERT/UPDATE/DELETE to those roles by default on every new
    table - "there's no RLS policy for that command, so it's fine" is not a
    permanent safe state, it's an accident of omission (a live audit found
    exactly this let any authenticated user forge `payment_transactions`
    rows against any recipient - see "Security hardening" in
    [06-conventions.md](./06-conventions.md)). Add the `revoke insert,
    update, delete on public.<table> from anon, authenticated;` line in the
    same migration that creates the table, the same way you'd add an index.
    `linked_destinations` is the one deliberate exception with real,
    correctly-scoped self-service policies.
22. **Every client-side call to a Server Action from a fire-and-forget
    `void (async () => {...})()` block needs its own try/catch, not just
    the server action's internal `xUnsafe` wrapper.** The server-side
    wrapper only catches errors that happen *inside* the action; it can't
    catch a dropped connection between browser and server. A 2026-07-26
    audit found 7 sites missing this (see "Exception handling..." in
    [06-conventions.md](./06-conventions.md)) where a thrown error left a
    manually-managed loading flag (`isSendingPayment`, `linkConnectingId`,
    etc.) stuck `true` forever - a button spinning with no error message,
    easily mistaken for the whole app being down during a live demo. In the
    catch block: reset whatever loading state was set, and show a generic
    `toast.error(...)` - never leave a pending state unresolved on failure.
23. **When applying a migration via the Supabase MCP `apply_migration` tool,
    its assigned `version` will not match the local file's embedded
    timestamp** - it stamps the actual apply-time, not the filename. Don't
    let this drift accumulate silently; either reconcile
    `supabase_migrations.schema_migrations` (via `execute_sql`, matching
    local filenames exactly - see the 2026-07-25 repair) after applying, or
    treat local filenames as documentation-only and never assume
    `supabase migration list`/`db push` will line up with them without
    checking first.
24. **Reverting a schema change means writing a new migration that undoes
    it, never editing or deleting the migration that introduced it.** Once a
    migration has been applied (to this shared project, not just written
    locally), treat it as immutable history - the same way you wouldn't
    force-push over a commit someone already pulled. Concrete precedent:
    `20260727121120_nearby_handoffs_direction_amount.sql` added a `direction`
    column for a sender-as-host feature; when that feature was cut,
    `20260727230729_nearby_handoffs_remove_direction.sql` dropped the column
    back out as its own migration, and a further
    `20260727232453_nearby_handoffs_remove_amount_source.sql` did the same
    for a column that became dead weight once a dependent feature was
    removed. All three stay in `supabase/migrations/` - that's the accurate
    history of what this schema actually went through, not clutter to clean
    up.

## Before you finish a change

Run, in this order, and do not report done until all pass:

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

For service-worker or manifest work, also confirm the build still emits the
Serwist precache line and spot-check the relevant routes in a production run.

## If something in these docs looks wrong

Trust the code, then fix the doc in the same change. Do not silently work
around a docs/code mismatch.
