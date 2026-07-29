import "server-only";

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

type RouteContext = { params: Promise<Record<string, string>> };
type RouteHandler = (request: Request, context: RouteContext) => Response | Promise<Response>;

/** Safety net for *unexpected* thrown errors (routes already handle expected failures with explicit responses) - always returns a clean 500 with a structured log line instead of a bare platform crash. */
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
