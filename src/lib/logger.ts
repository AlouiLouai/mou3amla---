import "server-only";

type LogContext = Record<string, unknown>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: error };
}

function emit(level: "info" | "warn" | "error", message: string, context?: LogContext) {
  const line = {
    level,
    message,
    time: new Date().toISOString(),
    ...context,
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
