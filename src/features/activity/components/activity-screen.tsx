import { ArrowDownLeft, ArrowUpRight, ChevronLeft } from "lucide-react";
import { BottomNav } from "@/features/squad/components/bottom-nav";
import { alpha, cardShadow, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";

function statusTone(status: string) {
  if (status === "confirmed") return { bg: alpha("#1DAA62", 0.12), color: "#17834C", label: "Confirmed" };
  if (status === "failed") return { bg: alpha(squad.destructive, 0.12), color: squad.destructive, label: "Failed" };
  return { bg: alpha(squad.subtle, 0.14), color: squad.subtle, label: "Initiated" };
}

export function ActivityScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { derived, actions } = squadApp;
  const account = derived.account;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto px-4 pt-[max(0.9rem,env(safe-area-inset-top))] pb-4">
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={actions.goHome}
            className="flex size-10 items-center justify-center rounded-full border"
            style={{ background: squad.card, borderColor: squad.border, boxShadow: cardShadow }}
          >
            <ChevronLeft className="size-4" />
          </button>

          <div>
            <div className="text-[1.2rem] font-black tracking-tight">Activity</div>
            <p className="text-[11px] font-semibold" style={{ color: squad.textFaint }}>
              Payment routing history across sent and received intents.
            </p>
          </div>
        </div>

        {account.activityLog.length === 0 ? (
          <div
            className="rounded-[24px] border p-5 text-center text-[12.5px]"
            style={{ background: squad.card, borderColor: squad.border, color: squad.textMuted, boxShadow: cardShadow }}
          >
            No activity yet. Your first routed payment will appear here.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {account.activityLog.map((item) => {
              const isSend = item.type === "send";
              const Icon = isSend ? ArrowUpRight : ArrowDownLeft;
              const tone = isSend ? squad.accent : squad.subtle;
              const status = statusTone(item.status);

              return (
                <div
                  key={item.id}
                  className="rounded-[22px] border p-4"
                  style={{ background: squad.card, borderColor: squad.border, boxShadow: cardShadow }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: alpha(tone, 0.12) }}>
                      <Icon className="size-4.5" style={{ color: tone }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[13.5px] font-black">{isSend ? item.counterparty : `From ${item.counterparty}`}</div>
                          <div className="mt-0.5 text-[11px] font-semibold" style={{ color: squad.textMuted }}>
                            {item.counterpartyHandle}
                          </div>
                        </div>
                        <div className="font-mono text-[13px] font-bold" style={{ color: isSend ? squad.accent : squad.subtle }}>
                          {isSend ? "-" : "+"}
                          {item.amount.toFixed(3)} DT
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-[11px]" style={{ color: squad.textMuted }}>
                          {item.wallet} - {item.date}
                        </div>
                        <span className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: status.bg, color: status.color }}>
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-2 font-mono text-[10px]" style={{ color: squad.textFaint }}>
                        {item.refId}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav active="activity" onHome={actions.goHome} onSend={actions.goGenerateIntent} onActivity={actions.goActivity} onProfile={actions.goProfile} />
    </div>
  );
}
