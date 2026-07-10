# Routing & Proxy

## App Router conventions

Standard Next.js App Router: routes live under `src/app/**`, using
`page.tsx`, `layout.tsx`, `route.ts`, and metadata file conventions
(`manifest.ts`, `icon.tsx`, etc.). Server Components by default; add
`"use client"` at the top of a file only when it needs state, effects, or
browser APIs.

Special routes in this app:

- `src/app/~offline/page.tsx` — offline fallback (see [03-pwa.md](./03-pwa.md)).
- `src/app/serwist/[path]/route.ts` — builds/serves the service worker.
- `src/app/icon-*.png/route.tsx` — generated manifest icons.

## `proxy.ts`, not `middleware.ts`

**This project intentionally has no `middleware.ts` file.** Next.js 16
renamed the "run code before a request completes" file convention from
`middleware` to `proxy` — same file location (project root or `src/`, next to
`app/`), same runtime, same `config.matcher` shape. Only the file name and
exported function name changed:

```ts
// src/proxy.ts
export function proxy(request: NextRequest) {
  // ...
}

export const config = {
  matcher: [ /* ... */ ],
};
```

If you see a task or a stale doc/tutorial referencing `middleware.ts`,
translate it to `proxy.ts` — do not create both files, and do not "restore"
`middleware.ts` thinking it's missing.

### What's already in `src/proxy.ts`

- Sets `x-request-id` (a fresh UUID per request) and `x-pathname` response
  headers.
- Has a commented-out **optimistic auth redirect example** — uncomment and
  adapt once real authentication exists. Per Next.js's own guidance, this
  kind of check should stay optimistic (fast, no data fetching); the actual
  authorization check must still happen in the route/Server Action itself.
- `matcher` excludes Next internals, the service worker route, the manifest,
  and static image extensions — so the proxy doesn't run on every asset
  request.

### Rules for editing it

- Keep it thin. No slow data fetching (`fetch` with `cache`/`revalidate`
  options is a no-op inside proxy/middleware anyway).
- If you narrow the `matcher`, double-check you haven't accidentally excluded
  a path that needs the header/redirect logic — a matcher change silently
  stops covering a route, it won't error.
- Don't rely on proxy alone for authorization. It's a network boundary, not
  an app layer — always re-check auth in the Server Action/route handler too.
