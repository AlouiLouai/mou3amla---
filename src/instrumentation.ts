import type { Instrumentation } from "next";
import { logger } from "@/lib/logger";
import { registerPostHogOtelLogger } from "@/lib/posthog-otel-logger";

/** Called once when a new server instance starts, before it serves any request. */
export async function register(): Promise<void> {
  // The OTel HTTP log exporter needs Node APIs - skip entirely on the Edge runtime.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await registerPostHogOtelLogger();
  }
}

/**
 * Catches server-side errors (Route Handlers, Server Actions, RSC render)
 * that Next.js itself intercepts, distinct from the two client-side error
 * boundaries (error.tsx, global-error.tsx) which only see errors that reach
 * the browser. Routed through the same `logger` as everywhere else, so it
 * also ships to PostHog Logs when configured, with the same redaction.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  logger.error("Unhandled server error", error, {
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
