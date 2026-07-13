import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { alpha, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";
import { BottomNav } from "@/features/squad/components/bottom-nav";

export function ActivityScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { derived, actions } = squadApp;
  const account = derived.account;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="mb-1 text-xl font-extrabold tracking-tight">Activity</div>
        <p className="mb-5 text-[11.5px]" style={{ color: squad.textFaint }}>
          Payment intents you&apos;ve sent or received via SQUAD.
        </p>
        {account.activityLog.length === 0 && (
          <div
            className="rounded-2xl border p-5 text-center text-[12.5px]"
            style={{ background: squad.card, borderColor: squad.border, color: squad.textMuted }}
          >
            No activity yet — payments you send or receive will show up here.
          </div>
        )}
        <div className="flex flex-col gap-2.5">
          {account.activityLog.map((item) => {
            const isSend = item.type === "send";
            const Icon = isSend ? ArrowUpRight : ArrowDownLeft;
            const color = isSend ? squad.subtle : squad.accent;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border p-3.5"
                style={{ background: squad.card, borderColor: squad.border }}
              >
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: alpha(color, 0.16) }}
                >
                  <Icon className="size-4" style={{ color }} />
                </div>
                <div className="flex-1">
                  <div className="text-[13.5px] font-bold">
                    {isSend ? `To ${item.counterparty}` : `From ${item.counterparty}`}
                  </div>
                  <div className="text-[11px]" style={{ color: squad.textMuted }}>
                    {item.wallet} · {item.date}
                  </div>
                </div>
                <div
                  className="font-mono text-[13.5px] font-semibold"
                  style={{ color: isSend ? squad.text : squad.accent }}
                >
                  {isSend ? "-" : "+"}
                  {item.amount.toFixed(3)} DT
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <BottomNav
        active="activity"
        onHome={actions.goHome}
        onSend={actions.goGenerateIntent}
        onActivity={actions.goActivity}
        onProfile={actions.goProfile}
      />
    </div>
  );
}
