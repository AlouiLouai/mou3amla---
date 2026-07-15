import "server-only";

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

type RouteContext = { params: Promise<Record<string, string>> };
type RouteHandler = (request: Request, context: RouteContext) => Response | Promise<Response>;

// Every route handler already handles its *expected* failure paths (bad
// input, missing rows, auth failures) with an explicit response. This is the
// safety net for the *unexpected* ones - a thrown error from anywhere in the
// handler (a Supabase client throwing on a malformed call, a null-deref bug,
// anything) would otherwise bubble up as an unhandled rejection and hand the
// caller a bare platform 500 with nothing useful logged. Wrapping every route
// in this wins us: (1) the server never crashes on a single bad request, and
// (2) there is always a structured, greppable log line explaining what broke.
export function withRouteErrorHandling(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      logger.error("Unhandled API route error", error, {
        method: request.method,
        url: request.url,
      });
      return NextResponse.json({ message: "Something went wrong on our end. Please try again." }, { status: 500 });
    }
  };
}
