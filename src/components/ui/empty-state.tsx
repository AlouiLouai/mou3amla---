import type { ReactNode } from "react";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";
import { cn } from "@/lib/utils";

// Generalizes the icon-badge pattern that only NotificationsScreen used to
// have (a size-12 rounded accent-tinted circle + heading + muted subcopy) -
// added 2026-07-25 so every "nothing here yet" moment in the app (activity,
// contacts, accounts, invoices, search results, nearby) shares one visual
// instead of some screens getting a plain text-only card and others a
// dashed box with no icon at all. `variant: "dashed"` is for a lighter-touch
// spot already nested inside another card (e.g. WalletStack's home-screen
// preview), where a second solid card would look heavy.
export function EmptyState({
  icon,
  title,
  body,
  action,
  variant = "card",
  className,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
  variant?: "card" | "dashed";
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-[24px] border p-5 text-center", variant === "dashed" && "border-dashed", className)}
      style={{
        background: variant === "card" ? mou3amla.card : "transparent",
        borderColor: variant === "card" ? mou3amla.border : mou3amla.borderStrong,
        boxShadow: variant === "card" ? cardShadow : undefined,
      }}
    >
      <div
        className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl animate-[mou3amla-empty-pop_0.4s_ease_both]"
        style={{ background: alpha(mou3amla.accent, 0.12), color: mou3amla.accent }}
      >
        {icon}
      </div>
      <div className="text-[14px] font-black" style={{ color: mou3amla.text }}>
        {title}
      </div>
      {body ? (
        <p className="mx-auto mt-2 max-w-[260px] text-[12px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
          {body}
        </p>
      ) : null}
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 rounded-full px-4 py-2 text-[11.5px] font-black text-white"
          style={{ background: mou3amla.accent }}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
