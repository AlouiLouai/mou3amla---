import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { AppHeader } from "@/features/mou3amla/components/app-header";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";

function statusTone(status: string) {
  if (status === "confirmed") return { bg: alpha("#1DAA62", 0.12), color: "#17834C", label: "Confirmed" };
  if (status === "failed") return { bg: alpha(mou3amla.destructive, 0.12), color: mou3amla.destructive, label: "Failed" };
  return { bg: alpha(mou3amla.subtle, 0.14), color: mou3amla.subtle, label: "Initiated" };
}

export function ActivityScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { derived, actions } = mou3amlaApp;
  const account = derived.account;
  const header = (
    <AppHeader
      profile={account.profile}
      unreadNotifications={derived.unreadNotifications}
      onNotifications={actions.goNotifications}
      onBack={actions.goHome}
    />
  );
  const footer = renderAppFooter("activity", actions);

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-4 pb-4">
        <div className="mb-3">
          <div className="text-[15px] font-black tracking-tight">Activity</div>
          <p className="text-[11px] font-semibold" style={{ color: mou3amla.textFaint }}>
            Payment routing history across sent and received intents.
          </p>
        </div>

        {account.activityLog.length === 0 ? (
          <div
            className="rounded-[24px] border p-5 text-center text-[12.5px]"
            style={{ background: mou3amla.card, borderColor: mou3amla.border, color: mou3amla.textMuted, boxShadow: cardShadow }}
          >
            No activity yet. Your first routed payment will appear here.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {account.activityLog.map((item) => {
              const isSend = item.type === "send";
              const Icon = isSend ? ArrowUpRight : ArrowDownLeft;
              const tone = isSend ? mou3amla.accent : mou3amla.subtle;
              const status = statusTone(item.status);

              return (
                <div
                  key={item.id}
                  className="rounded-[22px] border p-4"
                  style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: alpha(tone, 0.12) }}>
                      <Icon className="size-4.5" style={{ color: tone }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[13.5px] font-black">{isSend ? item.counterparty : `From ${item.counterparty}`}</div>
                          <div className="mt-0.5 text-[11px] font-semibold" style={{ color: mou3amla.textMuted }}>
                            {item.counterpartyHandle}
                          </div>
                        </div>
                        <div className="font-mono text-[13px] font-bold" style={{ color: isSend ? mou3amla.accent : mou3amla.subtle }}>
                          {isSend ? "-" : "+"}
                          {item.amount.toFixed(3)} DT
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-[11px]" style={{ color: mou3amla.textMuted }}>
                          {item.wallet} - {item.date}
                        </div>
                        <span className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: status.bg, color: status.color }}>
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-2 font-mono text-[10px]" style={{ color: mou3amla.textFaint }}>
                        {item.refId}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </ScreenFrame>
  );
}
