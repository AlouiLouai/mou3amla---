# Testing

## Stack

- **Vitest** (`vitest.config.mts`) - the framework Next.js's own docs
  recommend for this App Router setup. Turbopack still bundles the app
  itself; Vitest uses its own Vite pipeline purely to run tests, which is
  normal and does not conflict with the Turbopack dev/build pipeline.
- **jsdom** is the default `test.environment` so future component tests
  (`@testing-library/react` is already installed) work out of the box.
- `pnpm test` runs once and exits (CI/verification-gate friendly). `pnpm
  test:watch` runs Vitest's interactive watch mode for local development.

## The one non-obvious gotcha: `server-only`

Almost every server-side module in this app (`env.server.ts`, Server
Actions, the Supabase admin/server clients, `didit.ts`, ...) imports the
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

`src/features/auth/server/actions.test.ts` is the reference example.
Pattern:

1. `vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }))`
   (and the same for `@/lib/supabase/server`), then import the mocked
   function and configure its return value per test with
   `vi.mocked(createAdminClient).mockReturnValue(...)`.
2. Build a minimal fake rather than reaching for a general-purpose Supabase
   mock library: a `.from(table)` call should return a chainable object
   (`select`/`insert`/`eq`/`or`/... all just `return this`) that resolves
   (via `.then()`, and via `.maybeSingle()` if the code path uses it) to a
   queued `{ data, error }` result. `makeFrom`/`makeFakeAdmin` in
   `actions.test.ts` are reusable in spirit for any other file that talks to
   `public.*` tables the same way - copy the pattern rather than the exact
   table/columns.
3. `next/navigation`'s `redirect()` normally throws to interrupt rendering.
   Mock it to throw a recognizable `Error` (e.g. `` `REDIRECT:${url}` ``) and
   assert with `.rejects.toThrow(...)` - don't mock it as a no-op, or a bug
   that skips a required redirect will pass silently.

## Where tests live

Colocated as `*.test.ts` next to the file under test (e.g.
`src/features/auth/lib/identity.test.ts`), not in a separate `__tests__`
tree - keeps a test next to the code it exercises as the codebase grows
past auth into other features.
