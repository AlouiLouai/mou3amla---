"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { completeMockCheckout } from "@/features/payments/server/mock-checkout-actions";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";

type MockCheckoutControlsProps = {
  refId: string;
  status: "initiated" | "confirmed" | "failed";
};

export function MockCheckoutControls({ refId, status }: MockCheckoutControlsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<"confirmed" | "failed" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [disclosureAcknowledged, setDisclosureAcknowledged] = useState(false);

  if (status !== "initiated") {
    return (
      <div
        className="rounded-[24px] border p-4 text-[12px] leading-relaxed"
        style={{
          background: status === "confirmed" ? alpha(mou3amla.accent, 0.08) : alpha(mou3amla.destructive, 0.08),
          borderColor: status === "confirmed" ? alpha(mou3amla.accent, 0.3) : alpha(mou3amla.destructive, 0.3),
          color: status === "confirmed" ? mou3amla.text : mou3amla.textMuted,
        }}
      >
        This mock checkout was already simulated as <span className="font-black uppercase">{status}</span>. You can reopen the
        transfer inside Activity from the home screen.
        <a
          href={`/home?screen=activity&payment_ref=${encodeURIComponent(refId)}`}
          className="mt-3 flex items-center justify-center rounded-full py-3 text-[13px] font-black"
          style={{ background: "#F5F7FB", color: "#0F172A", boxShadow: cardShadow }}
        >
          Open Activity
        </a>
      </div>
    );
  }

  function run(outcome: "confirmed" | "failed") {
    setMessage(null);
    setPendingOutcome(outcome);

    startTransition(() => {
      void (async () => {
        try {
          const result = await completeMockCheckout({ refId, outcome });

          if (!result.ok) {
            setPendingOutcome(null);
            setMessage(result.message);
            return;
          }

          window.location.assign(result.redirectTo);
        } catch {
          // Without this, a dropped connection left both Simulate buttons
          // looking stuck with no feedback - the single worst place for
          // that to happen live in front of a BCT reviewer.
          setPendingOutcome(null);
          setMessage("We couldn't reach Mou3amla right now. Please try again.");
        }
      })();
    });
  }

  const canSimulate = disclosureAcknowledged && !isPending;

  return (
    <div className="space-y-3">
      <label
        className="flex cursor-pointer items-start gap-2.5 rounded-[18px] border px-4 py-3 text-[11.5px] leading-relaxed"
        style={{ background: "#F8FAFC", borderColor: "#E2E8F0", color: "#475569" }}
      >
        <input
          type="checkbox"
          checked={disclosureAcknowledged}
          onChange={(e) => setDisclosureAcknowledged(e.target.checked)}
          className="mt-0.5 size-4 shrink-0"
        />
        <span>
          I acknowledge that this transaction is routed in a controlled BCT Regulatory Sandbox environment. No real funds are held by
          Mou3amla.
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => run("confirmed")}
          disabled={!canSimulate}
          className="flex items-center justify-center gap-2 rounded-[22px] border px-4 py-4 text-[13px] font-black transition-opacity disabled:opacity-60"
          style={{
            background: "#EFF6FF",
            color: "#0F172A",
            borderColor: alpha(mou3amla.accent, 0.28),
            boxShadow: cardShadow,
          }}
        >
          {isPending && pendingOutcome === "confirmed" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Simulate Success
        </button>
        <button
          type="button"
          onClick={() => run("failed")}
          disabled={!canSimulate}
          className="flex items-center justify-center gap-2 rounded-[22px] border px-4 py-4 text-[13px] font-black transition-opacity disabled:opacity-60"
          style={{
            background: "#FEF2F2",
            color: "#7F1D1D",
            borderColor: alpha(mou3amla.destructive, 0.28),
            boxShadow: cardShadow,
          }}
        >
          {isPending && pendingOutcome === "failed" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
          Simulate Failure
        </button>
      </div>

      <div
        className="rounded-[20px] border px-4 py-3 text-[11.5px] leading-relaxed"
        style={{
          background: "#F8FAFC",
          borderColor: "#E2E8F0",
          color: "#475569",
        }}
      >
        <div className="mb-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: "#0F172A" }}>
          <ShieldAlert className="size-3.5" />
          Demo Controls
        </div>
        Success confirms the transfer and triggers the recipient notification. Failure keeps the route in history with a failed status so
        we can demo edge cases on demand.
      </div>

      {message ? (
        <div
          className="rounded-[18px] border px-4 py-3 text-[12px]"
          style={{
            background: "#FEF2F2",
            borderColor: "#FECACA",
            color: "#B91C1C",
          }}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}
