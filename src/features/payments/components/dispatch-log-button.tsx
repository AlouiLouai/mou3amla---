"use client";

import { useState } from "react";
import { FileJson, X } from "lucide-react";
import { alpha } from "@/features/mou3amla/constants";

type DispatchLogButtonProps = {
  refId: string;
  amount: number;
  currency: string;
  providerName: string;
  status: "initiated" | "confirmed" | "failed";
};

const STATUS_LABEL: Record<DispatchLogButtonProps["status"], string> = {
  initiated: "DISPATCH_READY",
  confirmed: "DISPATCH_CONFIRMED",
  failed: "DISPATCH_FAILED",
};

/** Audit-trail viewer for BCT sandbox review - every field is read straight
 * off this session's real `payment_transactions` record (see
 * `mock-checkout.ts`), not a static sample payload. `timestamp` is when the
 * log was opened, not the transaction's creation time (see "Session
 * details" for that). `passkey_verified` is always true because WebAuthn
 * passkey auth gates every Mou3amla account before it can send or receive -
 * see docs/06-conventions.md#auth-conventions. */
export function DispatchLogButton({ refId, amount, currency, providerName, status }: DispatchLogButtonProps) {
  const [open, setOpen] = useState(false);

  const payload = {
    timestamp: new Date().toISOString(),
    transaction_id: refId,
    orchestrator: "Mou3amla_PISP",
    route_selected: providerName,
    passkey_verified: true,
    custody_type: "NON_CUSTODIAL",
    amount: amount,
    currency,
    status: STATUS_LABEL[status],
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.1em]"
        style={{ background: "#FFFFFF", borderColor: "#CBD5E1", color: "#334155" }}
      >
        <FileJson className="size-3.5" />
        View Dispatch Log JSON
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close dispatch log"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ background: "rgba(5,6,8,0.65)" }}
          />
          <div
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 overflow-hidden rounded-[24px] border"
            style={{ background: "#0F172A", borderColor: "#1E293B", boxShadow: "0 30px 70px rgba(0,0,0,0.4)" }}
          >
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "#1E293B" }}>
              <div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: "#94A3B8" }}>
                Dispatch Log - Audit Payload
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="flex size-7 items-center justify-center rounded-full"
                style={{ background: alpha("#FFFFFF", 0.08), color: "#94A3B8" }}
              >
                <X className="size-3.5" />
              </button>
            </div>
            <pre className="overflow-x-auto px-5 py-4 text-[12px] leading-relaxed" style={{ color: "#7DD3FC" }}>
              {JSON.stringify(payload, null, 2)}
            </pre>
            <div
              className="border-t px-5 py-3 text-[10.5px] leading-relaxed"
              style={{ borderColor: "#1E293B", color: "#64748B", background: "#0B1220" }}
            >
              Generated from this session&apos;s live mock transaction record. Indicatif BCT / internal dev flow only - no real funds move.
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
