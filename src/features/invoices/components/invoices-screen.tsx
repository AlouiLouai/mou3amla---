import { Download } from "lucide-react";
import { invoicesToCsv } from "@/features/invoices/lib/el-fatoora";
import { AppHeader } from "@/features/squad/components/app-header";
import { renderAppFooter } from "@/features/squad/components/bottom-nav";
import { ScreenFrame } from "@/features/squad/components/screen-frame";
import { alpha, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";

function downloadCsv(csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `squad-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function InvoicesScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { derived, actions } = squadApp;
  const account = derived.account;
  const header = (
    <AppHeader profile={account.profile} unreadNotifications={derived.unreadNotifications} onNotifications={actions.goNotifications} />
  );
  const footer = renderAppFooter("invoices", actions);

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-5 pb-8">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="text-[15px] font-black tracking-tight">Invoices (El Fatoora)</div>
        <button
          type="button"
          onClick={() => downloadCsv(invoicesToCsv(account.invoices))}
          disabled={account.invoices.length === 0}
          className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-opacity disabled:opacity-40"
          style={{ borderColor: alpha(squad.accent, 0.3), background: alpha(squad.accent, 0.08), color: squad.accent }}
        >
          <Download className="size-3.5" />
          Export
        </button>
      </div>
      <p className="mb-3 text-[11.5px] leading-relaxed" style={{ color: squad.textFaint }}>
        Stamp duty shown is an illustrative placeholder - confirm the current Timbre Fiscal rate with your accountant before filing.
      </p>

      {account.invoices.length === 0 ? (
        <div
          className="rounded-2xl border p-5 text-center text-[12.5px]"
          style={{ background: squad.card, borderColor: squad.border, color: squad.textMuted }}
        >
          Invoices appear automatically after a confirmed payment intent.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {account.invoices.map((invoice) => (
            <div key={invoice.id} className="rounded-2xl border p-4" style={{ background: squad.card, borderColor: squad.border }}>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[13.5px] font-bold">{invoice.counterparty}</div>
                <div className="font-mono text-[11px]" style={{ color: squad.textMuted }}>
                  {invoice.date}
                </div>
              </div>
              <div className="flex items-center justify-between text-[12px]" style={{ color: squad.textMuted }}>
                <span>Amount</span>
                <span className="font-mono">{invoice.amount.toFixed(3)} DT</span>
              </div>
              <div className="flex items-center justify-between text-[12px]" style={{ color: squad.textMuted }}>
                <span>Timbre Fiscal (placeholder)</span>
                <span className="font-mono">{invoice.stampDuty.toFixed(3)} DT</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between border-t pt-1.5 text-[13px] font-bold" style={{ borderColor: squad.border }}>
                <span>Total</span>
                <span className="font-mono" style={{ color: squad.accent }}>
                  {invoice.total.toFixed(3)} DT
                </span>
              </div>
              <div className="mt-2 font-mono text-[10.5px]" style={{ color: squad.textFaint }}>
                {invoice.refId}
              </div>
            </div>
          ))}
        </div>
      )}
    </ScreenFrame>
  );
}
