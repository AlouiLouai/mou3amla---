import { redirect } from "next/navigation";
import { ArrowLeftRight, BadgeCheck, Check, CreditCard, Landmark, ShieldCheck, Smartphone } from "lucide-react";
import { requireCurrentAppUser } from "@/features/auth/server/dal";
import { MockCheckoutControls } from "@/features/payments/components/mock-checkout-controls";
import { loadMockCheckoutSession } from "@/features/payments/server/mock-checkout";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";

type MockCheckoutPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const PAYMENT_METHODS = [
  {
    id: "wallet",
    label: "Mobile wallet",
    detail: "Fast demo path for wallet-backed TUNPAY payments",
    icon: Smartphone,
  },
  {
    id: "bank_card",
    label: "Bank card",
    detail: "Simple indicative card flow for stakeholder demos",
    icon: CreditCard,
  },
  {
    id: "bank_transfer",
    label: "Bank transfer",
    detail: "Indicative interbank method for linked RIB accounts",
    icon: Landmark,
  },
] as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("fr-TN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function MockCheckoutPage(props: MockCheckoutPageProps) {
  const [user, searchParams] = await Promise.all([requireCurrentAppUser(), props.searchParams]);
  const refId = typeof searchParams.ref === "string" ? searchParams.ref : "";

  if (!refId) {
    redirect("/home");
  }

  const session = await loadMockCheckoutSession(refId, user.id);
  if (!session) {
    redirect("/home");
  }

  return (
    <div
      className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8"
      style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)" }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "#E2E8F0" }}>
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: "#64748B" }}>
              Mou3amla Secure Checkout
            </div>
            <div className="mt-1 text-[13px] leading-relaxed text-slate-500">
              Universal payment-page style mock for internal development, stakeholder demos, and BCT presentation walkthroughs.
            </div>
          </div>
          <a
            href={`/home?screen=activity&payment_ref=${encodeURIComponent(session.refId)}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em]"
            style={{
              background: "#FFFFFF",
              borderColor: "#CBD5E1",
              color: "#334155",
              boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
            }}
          >
            <ArrowLeftRight className="size-3.5" />
            Back to Activity
          </a>
        </div>

        <div
          className="mb-5 rounded-[22px] border px-4 py-3 sm:px-5"
          style={{
            background: "#FFF7ED",
            borderColor: "#FED7AA",
            boxShadow: "0 14px 26px rgba(154,52,18,0.08)",
          }}
        >
          <div className="mb-1 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: "#9A3412" }}>
            🛠️ DEVELOPMENT MOCK ENVIRONMENT - NO REAL MONEY MOVED
          </div>
          <div className="text-[12px] leading-relaxed" style={{ color: "#7C2D12" }}>
            Indicative Mou3amla-owned checkout for BCT review. This screen intentionally avoids third-party cloning and represents an
            internal mock only.
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_380px]">
          <section
            className="rounded-[30px] border p-5 sm:p-7"
            style={{
              background: "#FFFFFF",
              borderColor: "#E2E8F0",
              boxShadow: "0 24px 60px rgba(15,23,42,0.08)",
            }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: "#64748B" }}>
                  Hosted payment mock
                </div>
                <h1 className="text-[30px] font-black leading-none text-slate-900">Complete payment</h1>
                <p className="mt-2 max-w-[520px] text-[13px] leading-relaxed text-slate-500">
                  Neutral checkout treatment inspired by international payment pages, while staying explicitly inside Mou3amla&apos;s own demo
                  environment.
                </p>
              </div>
              <div className="flex size-12 shrink-0 items-center justify-center rounded-[16px]" style={{ background: "#F1F5F9", color: "#0F172A" }}>
                <BadgeCheck className="size-5" />
              </div>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border p-4" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#94A3B8" }}>
                  Sender
                </div>
                <div className="text-[15px] font-black text-slate-900">{session.senderDisplayName}</div>
                <div className="mt-1 text-[12px] text-slate-500">@{session.senderUsername}</div>
              </div>
              <div className="rounded-[22px] border p-4" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#94A3B8" }}>
                  Receiver
                </div>
                <div className="text-[15px] font-black text-slate-900">{session.receiverDisplayName}</div>
                <div className="mt-1 text-[12px] text-slate-500">@{session.receiverUsername}</div>
              </div>
              <div className="rounded-[22px] border p-4" style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#94A3B8" }}>
                  Source route
                </div>
                <div className="text-[15px] font-black text-slate-900">{session.providerName}</div>
                <div className="mt-1 text-[12px] text-slate-500">{session.senderWalletName}</div>
              </div>
            </div>

            <div className="mb-6 rounded-[26px] border p-5" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="size-4.5" style={{ color: mou3amla.accent }} />
                <div className="text-[12px] font-black uppercase tracking-[0.16em]" style={{ color: "#475569" }}>
                  Payment method
                </div>
              </div>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method, index) => {
                  const Icon = method.icon;
                  const selected = index === 0;
                  return (
                    <label
                      key={method.id}
                      className="flex cursor-default items-start gap-4 rounded-[20px] border px-4 py-4"
                      style={{
                        background: selected ? "#F8FAFC" : "#FFFFFF",
                        borderColor: selected ? alpha(mou3amla.accent, 0.32) : "#E2E8F0",
                        boxShadow: selected ? "0 10px 24px rgba(14,165,233,0.08)" : "none",
                      }}
                    >
                      <div className="pt-0.5">
                        <div
                          className="flex size-5 items-center justify-center rounded-full border"
                          style={{
                            background: selected ? mou3amla.accent : "#FFFFFF",
                            borderColor: selected ? mou3amla.accent : "#CBD5E1",
                            color: "#FFFFFF",
                          }}
                        >
                          {selected ? <Check className="size-3" /> : null}
                        </div>
                      </div>
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full"
                        style={{ background: selected ? alpha(mou3amla.accent, 0.12) : "#F8FAFC", color: selected ? mou3amla.accent : "#64748B" }}
                      >
                        <Icon className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[14px] font-black text-slate-900">{method.label}</div>
                        <div className="mt-1 text-[12px] leading-relaxed text-slate-500">{method.detail}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[24px] border p-4 sm:p-5" style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}>
              <div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: "#64748B" }}>
                Demo controls
              </div>
              <MockCheckoutControls refId={session.refId} status={session.status} />
            </div>
          </section>

          <aside
            className="rounded-[30px] border p-5 sm:p-6 lg:sticky lg:top-6 lg:self-start"
            style={{
              background: "#FFFFFF",
              borderColor: "#E2E8F0",
              boxShadow: "0 24px 60px rgba(15,23,42,0.08)",
            }}
          >
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: "#64748B" }}>
              Order summary
            </div>
            <div
              className="mb-5 rounded-[24px] border p-5"
              style={{
                background: "linear-gradient(180deg, #0F172A 0%, #111827 100%)",
                borderColor: "#0F172A",
                boxShadow: cardShadow,
              }}
            >
              <div className="mb-2 text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: "#94A3B8" }}>
                Amount due
              </div>
              <div className="flex items-end gap-2">
                <span className="text-[38px] font-black leading-none text-white">{formatCurrency(session.amount)}</span>
                <span className="pb-1 text-[15px] font-black text-sky-300">{session.currency}</span>
              </div>
              <div className="mt-4 h-px w-full" style={{ background: "rgba(148,163,184,0.2)" }} />
              <div className="mt-4 space-y-2 text-[12px] leading-relaxed text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <span>Merchant / route</span>
                  <span className="font-semibold text-white">{session.providerName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Payment reference</span>
                  <span className="font-mono text-[11px] text-white">{session.refId}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-[12px]">
              <div className="rounded-[20px] border p-4" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#94A3B8" }}>
                  Recipient
                </div>
                <div className="font-black text-slate-900">{session.receiverDisplayName}</div>
                <div className="mt-1 text-slate-500">@{session.receiverUsername}</div>
              </div>

              <div className="rounded-[20px] border p-4" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
                <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#94A3B8" }}>
                  Session details
                </div>
                <div className="space-y-3 text-slate-600">
                  <div className="flex items-start justify-between gap-3">
                    <span>Created</span>
                    <span className="text-right text-slate-900">{formatTimestamp(session.createdAt)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span>Status</span>
                    <span className="font-black uppercase" style={{ color: session.status === "failed" ? mou3amla.destructive : "#0F172A" }}>
                      {session.status}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span>Presentation note</span>
                    <span className="text-right text-slate-900">Indicatif BCT / internal dev flow only</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] border p-4" style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#94A3B8" }}>
                  Checkout note
                </div>
                <div className="text-[12px] leading-relaxed text-slate-600">
                  This page is intentionally simple, provider-neutral, and suitable for an international payment-page style walkthrough
                  without implying real acquiring, card processing, or fund movement.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
