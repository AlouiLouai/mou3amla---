import type { Invoice } from "@/features/invoices/types";
import type { PaymentIntent } from "@/features/payments/types";

/**
 * PLACEHOLDER — Tunisia's "Timbre Fiscal" (stamp duty) rate on commercial
 * documents is set/revised by the annual Finance Law and varies by document
 * type and exemption thresholds. This flat figure is illustrative only for
 * this prototype's micro-invoice demo. Do NOT treat it as compliant tax
 * guidance — confirm the current rate with an accountant or the relevant
 * BCT/Finance Ministry circular before using this for real invoices. See
 * docs/07-agent-guardrails.md.
 */
export const PLACEHOLDER_STAMP_DUTY_TND = 1.0;

export function computeStampDuty(): number {
  return PLACEHOLDER_STAMP_DUTY_TND;
}

export function buildInvoice(intent: PaymentIntent, counterparty: string): Invoice {
  const stampDuty = computeStampDuty();
  return {
    id: intent.id,
    refId: intent.refId,
    amount: intent.amount,
    stampDuty,
    total: intent.amount + stampDuty,
    date: new Date(intent.createdAt).toLocaleDateString(),
    counterparty,
  };
}

export function invoicesToCsv(invoices: Invoice[]): string {
  const header = "ref_id,date,counterparty,amount_tnd,stamp_duty_tnd,total_tnd";
  const rows = invoices.map((inv) =>
    [inv.refId, inv.date, inv.counterparty, inv.amount.toFixed(3), inv.stampDuty.toFixed(3), inv.total.toFixed(3)].join(","),
  );
  return [header, ...rows].join("\n");
}
