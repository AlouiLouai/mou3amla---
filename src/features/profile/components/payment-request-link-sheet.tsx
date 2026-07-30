"use client";

import { useState } from "react";
import { Copy, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { alpha, mou3amla } from "@/features/mou3amla/constants";
import { env } from "@/config/env";
import { BCT_SANDBOX_TEST_LIMIT_TND } from "@/features/payments/constants";
import { toast } from "@/lib/toast";

const QUICK_AMOUNTS = [5, 10, 20];

/**
 * Builds a `/pay/[username]` link, optionally with a prefilled amount - a UI
 * convenience only (see docs/06-conventions.md's payment-request-link
 * section): opening it still runs every check `createPaymentIntent` already
 * does, this just seeds `generate-intent-screen`'s fields instead of asking
 * the payer to type the @username and amount by hand over chat. The amount
 * entry mirrors that same screen's hero-number + quick-amount-chip pattern
 * instead of a compact settings-row input, so it reads as the app's one
 * "enter an amount" experience rather than a one-off form field.
 */
export function PaymentRequestLinkSheet({ open, username, onClose }: { open: boolean; username: string; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const parsedAmount = Number.parseFloat(amount);
  const exceedsCap = parsedAmount > BCT_SANDBOX_TEST_LIMIT_TND;

  const copyLink = () => {
    const base = env.NEXT_PUBLIC_APP_URL ?? "https://mou3amla.app";
    const query = amount && !exceedsCap && parsedAmount > 0 ? `?amount=${parsedAmount}` : "";
    const link = `${base}/pay/${username}${query}`;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(link);
    }
    toast.success("Payment link copied", { description: link });
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[15px] font-bold">Request a payment</div>
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
        Share this link over chat - opening it takes @{username} straight to a pre-filled send, amount included if you set one. They can still
        edit everything before confirming.
      </p>

      <div className="mb-4 flex flex-col items-center rounded-[22px] border py-5" style={{ background: mou3amla.cardAlt, borderColor: mou3amla.border }}>
        <span className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: mou3amla.textFaint }}>
          Amount (optional)
        </span>
        <div className="flex items-center gap-2">
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            size={Math.max(1, amount.length || 1)}
            className="border-none bg-transparent text-center font-mono text-[36px] font-semibold tracking-tight outline-none"
            style={{ color: mou3amla.text, maxWidth: "8ch" }}
          />
          <span className="font-mono text-lg" style={{ color: mou3amla.accent }}>
            TND
          </span>
          {amount ? (
            <button
              type="button"
              onClick={() => setAmount("")}
              aria-label="Clear amount"
              className="flex size-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: alpha(mou3amla.text, 0.08), color: mou3amla.textMuted }}
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-2">
          {QUICK_AMOUNTS.map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => setAmount(String(quick))}
              className="rounded-full border px-3.5 py-1.5 text-xs font-bold"
              style={{ color: mou3amla.accent, background: alpha(mou3amla.accent, 0.1), borderColor: alpha(mou3amla.accent, 0.3) }}
            >
              +{quick} TND
            </button>
          ))}
        </div>

        {exceedsCap ? (
          <p className="mt-3 px-4 text-center text-[10.5px] font-semibold" style={{ color: mou3amla.destructive }}>
            Over the {BCT_SANDBOX_TEST_LIMIT_TND} TND sandbox cap - the link will leave the amount open instead.
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={copyLink}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[13.5px] font-black transition-transform active:scale-[0.98]"
        style={{ background: mou3amla.accent, color: "#FFFFFF" }}
      >
        <Copy className="size-4" />
        Copy link
      </button>
    </BottomSheet>
  );
}
