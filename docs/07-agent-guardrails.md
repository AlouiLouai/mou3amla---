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
13. **SQUAD is zero-liability by design.** Do not add balances, stored bank
    credentials, or balance-fetching behavior.
14. **Do not split auth into separate sign-in/sign-up screens unless the user
    explicitly changes the product requirement.** The current architecture is a
    unified phone + username landing flow.
15. **Do not bypass `src/config/env.ts`.** New env vars must be validated
    there before use.
16. **Supabase schema changes must land in migrations.** Do not leave durable
    database changes implied only in app code.
17. **Identity verification is post-auth.** Do not gate the initial OTP login
    on CIN/selfie completion; KYC unlocks higher-trust features afterward.

## Before you finish a change

Run, in this order, and do not report done until all pass:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

For service-worker or manifest work, also confirm the build still emits the
Serwist precache line and spot-check the relevant routes in a production run.

## If something in these docs looks wrong

Trust the code, then fix the doc in the same change. Do not silently work
around a docs/code mismatch.
