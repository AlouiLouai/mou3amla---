"use client";

import { Check, X } from "lucide-react";
import { alpha, mou3amla, raisedShadow } from "@/features/mou3amla/constants";
import { LANGUAGES } from "@/features/i18n/translations";
import { useTranslation } from "@/features/i18n/language-store";

export function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language, setLanguage, t } = useTranslation();

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
      </div>
    </>
  );
}
