"use client";

import { Check, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { alpha, mou3amla } from "@/features/mou3amla/constants";
import { LANGUAGES } from "@/features/i18n/translations";
import { useTranslation } from "@/features/i18n/language-store";

export function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language, setLanguage, t } = useTranslation();

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[15px] font-bold">{t("profile.language")}</div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-[26px] items-center justify-center rounded-full"
          style={{ background: mou3amla.cardAlt, color: mou3amla.textMuted }}
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {LANGUAGES.map((option) => {
          const selected = option.id === language;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setLanguage(option.id);
                onClose();
              }}
              className="flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left"
              style={{
                background: selected ? alpha(mou3amla.accent, 0.1) : mou3amla.cardAlt,
                borderColor: selected ? mou3amla.accent : mou3amla.border,
              }}
            >
              <span>
                <span className="block text-[13px] font-bold">{option.nativeLabel}</span>
                <span className="block text-[11px]" style={{ color: mou3amla.textMuted }}>
                  {option.label}
                </span>
              </span>
              {selected ? <Check className="size-4" style={{ color: mou3amla.accent }} /> : null}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
