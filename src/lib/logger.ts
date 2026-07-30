import "server-only";
import { emitToPostHog } from "@/lib/posthog-otel-logger";

type LogContext = Record<string, unknown>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: error };
}

// Key-based, not value-based redaction: cheap, and catches a sensitive field
// (phone, RIB, credential, token) regardless of which log call introduces it.
const REDACTED_KEY_PATTERN = /phone|routing_value|routingvalue|\brib\b|credential|public_key|publickey|challenge|token|secret|password/i;
const REDACTED_PLACEHOLDER = "[redacted]";
const MAX_REDACTION_DEPTH = 6;

function redactContext(value: unknown, depth = 0): unknown {
  if (depth > MAX_REDACTION_DEPTH) return "[redacted:max-depth]";

  if (Array.isArray(value)) {
    return value.map((item) => redactContext(item, depth + 1));
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = REDACTED_KEY_PATTERN.test(key) ? REDACTED_PLACEHOLDER : redactContext(val, depth + 1);
    }
    return out;
  }

  return value;
}

function emit(level: "info" | "warn" | "error", message: string, context?: LogContext) {
  const redactedContext = context ? (redactContext(context) as LogContext) : {};
  const line = { level, message, time: new Date().toISOString(), ...redactedContext };

  // Structured JSON so Vercel's log viewer (and any downstream log drain)
  // can filter/search by level, route, or user id instead of grepping free text.
  const serialized = JSON.stringify(line);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);

  // Same redacted context, never the raw one - a second logging path must
  // not become a way to bypass the redaction above.
  emitToPostHog(level, message, redactedContext);
}

/** Minimal structured server-side logger - not a full observability vendor, just enough to leave a greppable, contextual trace. */
export const logger = {
  info(message: string, context?: LogContext) {
    emit("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    emit("warn", message, context);
  },
  error(message: string, error?: unknown, context?: LogContext) {
    emit("error", message, { ...context, error: error !== undefined ? serializeError(error) : undefined });
  },
};
