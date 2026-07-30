import "server-only";
import { SeverityNumber, type Logger as OtelLogger } from "@opentelemetry/api-logs";
import { env } from "@/config/env";

declare global {
  // Instrumentation.ts and route/server-action modules are separate bundled
  // entry points in Next.js - a plain module-level variable wouldn't be
  // shared between them, so PostHog's own docs use this same globalThis
  // handoff pattern.
  var __posthogOtelLogger: OtelLogger | undefined;
}

const SEVERITY: Record<"info" | "warn" | "error", { number: SeverityNumber; text: string }> = {
  info: { number: SeverityNumber.INFO, text: "INFO" },
  warn: { number: SeverityNumber.WARN, text: "WARN" },
  error: { number: SeverityNumber.ERROR, text: "ERROR" },
};

/**
 * Registers the OTel logger that ships every `logger.*` call (already
 * redacted - see logger.ts's `emit()`) to PostHog Logs. Call once from
 * instrumentation.ts's `register()`. Entirely opt-in, same as
 * AnalyticsProvider: no-ops if `NEXT_PUBLIC_POSTHOG_KEY` is unset, and the
 * OTel SDK itself is only loaded when it's actually needed.
 */
export async function registerPostHogOtelLogger(): Promise<void> {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY || globalThis.__posthogOtelLogger) return;

  const [{ OTLPLogExporter }, { resourceFromAttributes }, { LoggerProvider, SimpleLogRecordProcessor }] = await Promise.all([
    import("@opentelemetry/exporter-logs-otlp-http"),
    import("@opentelemetry/resources"),
    import("@opentelemetry/sdk-logs"),
  ]);

  const host = env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  const exporter = new OTLPLogExporter({
    url: `${host}/otlp/v1/logs`,
    headers: { Authorization: `Bearer ${env.NEXT_PUBLIC_POSTHOG_KEY}` },
  });

  // Simple (synchronous per-record export), not Batch: a Vercel serverless
  // function can suspend right after responding with no guaranteed flush
  // window, so a batched exporter risks silently dropping buffered logs.
  // Only the already-uncommon warn/error paths pay the extra latency.
  const provider = new LoggerProvider({
    resource: resourceFromAttributes({ "service.name": "mou3amla" }),
    processors: [new SimpleLogRecordProcessor({ exporter })],
  });

  globalThis.__posthogOtelLogger = provider.getLogger("mou3amla");
}

/** Forwards an already-redacted log line to PostHog Logs, if registered. No-ops otherwise. */
export function emitToPostHog(level: "info" | "warn" | "error", message: string, attributes: Record<string, unknown>): void {
  const otelLogger = globalThis.__posthogOtelLogger;
  if (!otelLogger) return;

  const { number, text } = SEVERITY[level];
  otelLogger.emit({ severityNumber: number, severityText: text, body: message, attributes: flattenForOtel(attributes) });
}

// OTel attribute values must be primitives (or arrays of them) - nested
// objects (e.g. a serialized error) are stringified rather than dropped.
function flattenForOtel(value: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val === undefined) continue;
    out[key] = typeof val === "string" || typeof val === "number" || typeof val === "boolean" ? val : JSON.stringify(val);
  }
  return out;
}
