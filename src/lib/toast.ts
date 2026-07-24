import { toast as sonnerToast, type ExternalToast } from "sonner";

// Centralizes duration policy in one place instead of every call site
// guessing its own - a quick confirmation ("Invite link copied") shouldn't
// linger as long as an error the user actually needs time to read and react
// to. Import `toast` from here everywhere instead of from "sonner" directly.
const DURATION_MS = {
  success: 3000,
  info: 3200,
  warning: 4500,
  error: 6000,
} as const;

function withDefaultDuration(kind: keyof typeof DURATION_MS) {
  return (message: React.ReactNode, data?: ExternalToast) => sonnerToast[kind](message, { duration: DURATION_MS[kind], ...data });
}

// `sonnerToast` is itself callable (a plain `{...sonnerToast}` object spread
// would lose that, breaking the untyped `toast("...")` call sites still used
// for neutral copy) - Object.assign onto a real function preserves both the
// call signature and every other sonner method, with only the four
// durationed ones below overridden.
export const toast = Object.assign((message: React.ReactNode, data?: ExternalToast) => sonnerToast(message, data), sonnerToast, {
  success: withDefaultDuration("success"),
  error: withDefaultDuration("error"),
  warning: withDefaultDuration("warning"),
  info: withDefaultDuration("info"),
});
