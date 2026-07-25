"use client";

import type { CSSProperties } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";
import { alpha, mou3amla } from "@/features/mou3amla/constants";

const Toaster = ({ ...props }: ToasterProps) => {
  // Sonner's own bundled CSS keys several things we don't override
  // ourselves (close-button icon color, default toast-type icon tints) off
  // its `theme` prop via a `data-theme` attribute, independent of our
  // `--normal-*` / `--mou3amla-*` custom properties below. A prior hardcoded
  // `theme="dark"` here meant those elements silently rendered dark-mode
  // colors even in light mode, making the close button essentially
  // invisible - visible/clickable now that it follows the real theme.
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "light" ? "light" : "dark";

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="top-center"
      closeButton
      duration={3200}
      offset={{ top: "max(1rem, env(safe-area-inset-top))" }}
      mobileOffset={{ top: "max(1rem, env(safe-area-inset-top))" }}
      icons={{
        success: (
          <span className="flex size-6 items-center justify-center rounded-full" style={{ background: alpha(mou3amla.accent, 0.16), color: mou3amla.accent }}>
            <CircleCheckIcon className="size-3.5" />
          </span>
        ),
        info: (
          <span className="flex size-6 items-center justify-center rounded-full" style={{ background: alpha(mou3amla.text, 0.1), color: mou3amla.text }}>
            <InfoIcon className="size-3.5" />
          </span>
        ),
        warning: (
          <span className="flex size-6 items-center justify-center rounded-full" style={{ background: alpha(mou3amla.subtle, 0.16), color: mou3amla.subtle }}>
            <TriangleAlertIcon className="size-3.5" />
          </span>
        ),
        error: (
          <span className="flex size-6 items-center justify-center rounded-full" style={{ background: alpha(mou3amla.destructive, 0.16), color: mou3amla.destructive }}>
            <OctagonXIcon className="size-3.5" />
          </span>
        ),
        loading: <Loader2Icon className="size-4 animate-spin" style={{ color: mou3amla.textMuted }} />,
      }}
      style={
        {
          "--normal-bg": mou3amla.card,
          "--normal-text": mou3amla.text,
          "--normal-border": mou3amla.border,
          "--success-bg": mou3amla.card,
          "--success-text": mou3amla.text,
          "--success-border": alpha(mou3amla.accent, 0.35),
          "--error-bg": mou3amla.card,
          "--error-text": mou3amla.destructive,
          "--error-border": alpha(mou3amla.destructive, 0.35),
          "--warning-bg": mou3amla.card,
          "--warning-text": mou3amla.subtle,
          "--warning-border": alpha(mou3amla.subtle, 0.35),
          "--info-bg": mou3amla.card,
          "--info-text": mou3amla.text,
          "--info-border": mou3amla.border,
          "--border-radius": "20px",
          "--mou3amla-toast-muted": mou3amla.textMuted,
          "--mou3amla-toast-cancel-bg": alpha(mou3amla.text, 0.08),
          "--mou3amla-toast-cancel-bg-hover": alpha(mou3amla.text, 0.14),
        } as CSSProperties
      }
      toastOptions={{
        // `duration` above (3200ms) is only the fallback for an untyped
        // `toast("...")`/`toast.message(...)` call - `src/lib/toast.ts`'s
        // wrapper passes a longer-for-error, shorter-for-success duration
        // per type for every typed call (success/error/warning/info), which
        // is what every real call site in this app actually uses. The
        // explicit close button (styled here, not left to Sonner's own
        // theme heuristics) and drag-to-dismiss are both always available
        // immediately regardless of duration.
        classNames: {
          // A left accent bar per semantic type (in addition to the icon
          // badge above) makes the toast's category readable at a glance,
          // even before reading the copy - closer to how a native
          // notification center distinguishes alert kinds.
          toast: "cn-toast relative overflow-hidden border border-l-[3px] shadow-[0_18px_44px_rgba(0,0,0,0.5),0_8px_20px_rgba(0,0,0,0.4)]",
          success: "border-l-(--success-border)",
          error: "border-l-(--error-border)",
          warning: "border-l-(--warning-border)",
          info: "border-l-(--info-border)",
          title: "font-semibold",
          description: "text-[0.8rem] text-(--mou3amla-toast-muted)",
          actionButton: "bg-[#0095F6] text-white hover:bg-[#0077C7] rounded-full px-3 font-semibold",
          cancelButton: "bg-(--mou3amla-toast-cancel-bg) text-(--normal-text) hover:bg-(--mou3amla-toast-cancel-bg-hover) rounded-full px-3 font-semibold",
          closeButton: "bg-(--normal-bg) text-(--normal-text) border-(--normal-border) hover:bg-(--mou3amla-toast-cancel-bg)",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
