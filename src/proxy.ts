import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (same runtime, clearer name).
 * Keep this file thin: it's a network boundary, not an app layer. Only put
 * cheap, synchronous-ish checks here (header/cookie rewrites, optimistic auth
 * redirects) — never slow data fetching. Enforce real authorization in the
 * route/server action itself, since a matcher change here can silently stop
 * covering a path.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("x-request-id", crypto.randomUUID());
  response.headers.set("x-pathname", request.nextUrl.pathname);

  // Example optimistic-auth pattern (uncomment and adapt once auth exists):
  // const hasSession = request.cookies.has("session");
  // if (!hasSession && request.nextUrl.pathname.startsWith("/dashboard")) {
  //   const url = new URL("/login", request.url);
  //   url.searchParams.set("from", request.nextUrl.pathname);
  //   return NextResponse.redirect(url);
  // }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every route except:
     * - Next internals (_next/static, _next/image)
     * - the service worker and PWA metadata files
     * - static assets with a file extension
     */
    "/((?!_next/static|_next/image|sw\\.js|manifest\\.webmanifest|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
