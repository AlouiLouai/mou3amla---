"use client";

import { X } from "lucide-react";
import { alpha, mou3amla, raisedShadow } from "@/features/mou3amla/constants";

export function InfoSheet({
  open,
  title,
  body,
  closeLabel,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  closeLabel: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-40 backdrop-blur-sm"
        style={{ background: "rgba(5,6,8,0.65)" }}
      />
      <div
        className="animate-[mou3amla-fadeup_0.25s_ease_both] fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-[28px] border border-b-0 px-5 pt-4.5 pb-[max(1.75rem,env(safe-area-inset-bottom))]"
        style={{ background: mou3amla.card, borderColor: mou3amla.borderStrong, boxShadow: raisedShadow }}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full" style={{ background: alpha(mou3amla.accent, 0.18) }} />
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[15px] font-bold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-[26px] items-center justify-center rounded-full"
            style={{ background: mou3amla.cardAlt, color: mou3amla.textMuted }}
          >
            <X className="size-3.5" />
          </button>
        </div>

        <p className="mb-4 text-[12.5px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
          {body}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl py-3 text-center text-[13px] font-bold"
          style={{ background: mou3amla.cardAlt, color: mou3amla.text }}
        >
          {closeLabel}
        </button>
      </div>
    </>
  );
}
