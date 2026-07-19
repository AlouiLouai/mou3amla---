import "server-only";

type LogContext = Record<string, unknown>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: error };
}

// Key-based, not value-based: this is a payments/KYC app, so a caller could
// easily pass a phone number, a RIB/wallet routing value, or a WebAuthn
// credential straight into a log's context object without thinking twice -
// there was previously no redaction at all, so any such value would print in
// the clear to stdout/Vercel logs. Matching on the key name (rather than
// trying to pattern-match values) is cheap and catches the field regardless
// of which log call introduces it, current or future.
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
  const line = {
    level,
    message,
    time: new Date().toISOString(),
    ...(context ? (redactContext(context) as LogContext) : {}),
  };

  // Structured JSON so Vercel's log viewer (and any downstream log drain)
  // can filter/search by level, route, or user id instead of grepping free text.
  const serialized = JSON.stringify(line);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

// A minimal structured server-side logger - not a swap-in for a full
// observability vendor, just enough that "something broke in production"
// always leaves a greppable, contextual trace instead of a bare stack trace
// or, worse, nothing at all.
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
