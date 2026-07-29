import { toast as sonnerToast, type ExternalToast } from "sonner";

// Centralizes duration policy - import `toast` from here, never "sonner" directly.
const DURATION_MS = {
  success: 3000,
  info: 3200,
  warning: 4500,
  error: 6000,
} as const;

function withDefaultDuration(kind: keyof typeof DURATION_MS) {
  return (message: React.ReactNode, data?: ExternalToast) => sonnerToast[kind](message, { duration: DURATION_MS[kind], ...data });
}

// Object.assign onto a real function (not a `{...sonnerToast}` spread) preserves
// `sonnerToast`'s own call signature for the untyped `toast("...")` call sites.
export const toast = Object.assign((message: React.ReactNode, data?: ExternalToast) => sonnerToast(message, data), sonnerToast, {
  success: withDefaultDuration("success"),
  error: withDefaultDuration("error"),
  warning: withDefaultDuration("warning"),
  info: withDefaultDuration("info"),
});
