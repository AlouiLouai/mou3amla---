"use client";

import { X } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { mou3amla } from "@/features/mou3amla/constants";

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
  return (
    <BottomSheet open={open} onClose={onClose}>
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
    </BottomSheet>
  );
}
