# Testing

## Stack

- **Vitest** (`vitest.config.mts`) - the framework Next.js's own docs
  recommend for this App Router setup. Turbopack still bundles the app
  itself; Vitest uses its own Vite pipeline purely to run tests, which is
  normal and does not conflict with the Turbopack dev/build pipeline.
- **jsdom** is the default `test.environment`. Every current test is a
  plain logic/server-action test (no component rendering) - `@testing-library/react`/
  `@testing-library/dom` were removed 2026-07-25 after confirming zero test
  imported them. If you add a real component-render test, `pnpm add -D
  @testing-library/react @testing-library/dom` first.
- `pnpm test` runs once and exits (CI/verification-gate friendly). `pnpm
  test:watch` runs Vitest's interactive watch mode for local development.

## The one non-obvious gotcha: `server-only`

Almost every server-side module in this app (`env.server.ts`, Server
Actions, the Supabase admin/server clients, ...) imports the
`server-only` package. Its `package.json` throws unconditionally from its
default export - it only resolves to a no-op under Next.js's own bundler-level
`"react-server"` condition, which Vite/Vitest has no concept of. Without a
fix, **importing almost anything server-side in a test throws immediately**,
regardless of `test.environment`.

The fix lives in `vitest.setup.ts`, loaded via `test.setupFiles`:

```ts
vi.mock("server-only", () => ({}));
```

If a new test suddenly fails with `"This module cannot be imported from a
Client Component module"`, check that `vitest.setup.ts` is actually wired
into `vitest.config.mts` before looking anywhere else.

## Test env vars

`vitest.config.mts`'s `test.env` sets fake values for the env vars
`src/config/env.ts`/`env.server.ts` require (`NEXT_PUBLIC_SUPABASE_URL`,
etc.) so those modules can import without throwing. These are placeholder
strings, not real credentials - tests never touch a real Supabase project;
they mock `createAdminClient`/`createClient` directly (see below). Don't
point tests at real infrastructure by loading `.env`/`.env.production` into
the test process.

## Mocking Supabase in a test

`src/features/auth/server/actions.test.ts` and
`src/features/wallets/server/actions.test.ts` are the reference examples.
Pattern:

1. `vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }))`
   (and the same for `@/lib/supabase/server`), then import the mocked
   function and configure its return value per test with
   `vi.mocked(createAdminClient).mockReturnValue(...)`.
2. Build a minimal fake rather than reaching for a general-purpose Supabase
   mock library: a `.from(table)` call should return a chainable object
   (`select`/`insert`/`eq`/`or`/... all just `return this`) that resolves
   (via `.then()`, and via `.maybeSingle()`/`.single()` if the code path uses
   them) to a queued `{ data, error, count? }` result. `makeFrom`/
   `makeFakeAdmin` in either reference test file are reusable in spirit for
   any other file that talks to `public.*` tables the same way - copy the
   pattern rather than the exact table/columns. The wallets version also
   records each `.select`/`.insert`/`.update` call so a test can assert on
   the exact payload sent (e.g. `is_default` being computed correctly).
3. `next/navigation`'s `redirect()` normally throws to interrupt rendering.
   Mock it to throw a recognizable `Error` (e.g. `` `REDIRECT:${url}` ``) and
   assert with `.rejects.toThrow(...)` - don't mock it as a no-op, or a bug
   that skips a required redirect will pass silently.
4. Also mock `@/lib/rate-limit` (`vi.fn()` for `checkRateLimit`, defaulting
   to `mockResolvedValue(true)` in `beforeEach`) for any action that's
   rate-limited - see guardrail #19 in
   [07-agent-guardrails.md](./07-agent-guardrails.md). Add one test that sets
   it to `false` and asserts the action fails fast, before `createAdminClient`
   is even called.

## Where tests live

Colocated as `*.test.ts` next to the file under test (e.g.
`src/features/auth/lib/identity.test.ts`), not in a separate `__tests__`
tree - keeps a test next to the code it exercises as the codebase grows
past auth into other features.
