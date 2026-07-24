"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/features/mou3amla/components/app-header";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { avatarColorFor, initialsFor } from "@/features/mou3amla/hooks/utils";
import { statusToneColor } from "@/features/mou3amla/status-tone";

const ACTIVITY_HIGHLIGHT_DURATION_MS = 3000;

type ActivityFilter = "all" | "send" | "receive";
const FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "send", label: "Sent" },
  { key: "receive", label: "Received" },
];

function statusTone(status: string) {
  if (status === "confirmed") {
    const color = statusToneColor("positive");
    return { bg: alpha(color, 0.12), color, label: "Confirmed" };
  }
  if (status === "failed") {
    const color = statusToneColor("negative");
    return { bg: alpha(color, 0.12), color, label: "Failed" };
  }
  const color = statusToneColor("pending");
  return { bg: alpha(color, 0.14), color, label: "Initiated" };
}

export function ActivityScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { state, derived, actions } = mou3amlaApp;
  const account = derived.account;
  const highlightedActivityId = state.highlightedActivityId;
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const filteredActivity = account.activityLog.filter((item) => filter === "all" || item.type === filter);
  const header = (
    <AppHeader
      profile={account.profile}
      unreadNotifications={derived.unreadNotifications}
      onNotifications={actions.goNotifications}
      onBack={actions.goHome}
    />
  );
  const footer = renderAppFooter("activity", actions);

  // Landing here right after a send (or a live payment_received event)
  // briefly colorizes that row so it's obvious which one just changed - see
  // the mou3amla-activity-highlight keyframes in globals.css.
  useEffect(() => {
    if (!highlightedActivityId) return;
    const timeout = setTimeout(() => actions.clearActivityHighlight(), ACTIVITY_HIGHLIGHT_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [highlightedActivityId, actions]);

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-4 pb-4">
        <div className="mb-3">
          <div className="text-[15px] font-black tracking-tight">Activity</div>
          <p className="text-[11px] font-semibold" style={{ color: mou3amla.textFaint }}>
            Payment routing history across sent and received intents.
          </p>
        </div>

        <div className="mb-3 flex items-center gap-2">
          {FILTERS.map(({ key, label }) => {
            const isActive = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className="rounded-full px-3.5 py-1.5 text-[11.5px] font-black transition-colors"
                style={{
                  background: isActive ? mou3amla.accent : mou3amla.card,
                  color: isActive ? "#FFFFFF" : mou3amla.textMuted,
                  border: `1px solid ${isActive ? mou3amla.accent : mou3amla.border}`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {filteredActivity.length === 0 ? (
          <div
            className="rounded-[24px] border p-5 text-center text-[12.5px]"
            style={{ background: mou3amla.card, borderColor: mou3amla.border, color: mou3amla.textMuted, boxShadow: cardShadow }}
          >
            {account.activityLog.length === 0 ? "No activity yet. Your first routed payment will appear here." : "Nothing here yet."}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredActivity.map((item) => {
              const isSend = item.type === "send";
              const status = statusTone(item.status);
              const avatarColor = avatarColorFor(item.counterpartyHandle);
              const isHighlighted = item.id === highlightedActivityId;

              return (
                <div
                  key={item.id}
                  className={`rounded-[22px] border p-3.5 ${isHighlighted ? "mou3amla-activity-highlight" : ""}`}
                  style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-11 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white"
                      style={{ background: avatarColor }}
                    >
                      {initialsFor(item.counterparty)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate text-[13px] font-black">{isSend ? item.counterparty : `From ${item.counterparty}`}</div>
                        <div className="shrink-0 font-mono text-[13px] font-bold" style={{ color: isSend ? "#FFFFFF" : mou3amla.accent }}>
                          {isSend ? "-" : "+"}
                          {item.amount.toFixed(3)} DT
                        </div>
                      </div>

                      <div className="mt-0.5 truncate text-[10.5px] font-semibold" style={{ color: mou3amla.textMuted }}>
                        {item.counterpartyHandle} · {item.wallet} · {item.date}
                      </div>

                      <span
                        className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9.5px] font-black"
                        style={{ background: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
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
