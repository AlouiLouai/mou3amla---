import { Bell, CheckCheck, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { AppHeader } from "@/features/squad/components/app-header";
import { renderAppFooter } from "@/features/squad/components/bottom-nav";
import { ScreenFrame } from "@/features/squad/components/screen-frame";
import { alpha, cardShadow, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";

function iconFor(type: string) {
  if (type === "payment_received" || type === "payment_sent") return CreditCard;
  if (type === "verification_approved" || type === "verification_pending") return ShieldCheck;
  return Sparkles;
}

function timeLabel(value: string): string {
  return notificationsTimeFormatter.format(new Date(value));
}

const notificationsTimeFormatter = new Intl.DateTimeFormat("fr-TN", {
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "short",
});

export function NotificationsScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { derived, actions } = squadApp;
  const notifications = derived.account.notifications;
  const header = (
    <AppHeader profile={derived.account.profile} unreadNotifications={derived.unreadNotifications} onNotifications={actions.goNotifications} />
  );
  const footer = renderAppFooter("notifications", actions);

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-4 pb-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[15px] font-black tracking-tight">Notifications</div>
            <div className="text-[11px] font-semibold" style={{ color: squad.textMuted }}>
              {derived.unreadNotifications} unread alert(s)
            </div>
          </div>
          <button
            type="button"
            onClick={actions.readAllNotifications}
            className="rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]"
            style={{ background: alpha(squad.accent, 0.1), color: squad.accent }}
          >
            Mark read
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-[24px] border p-5 text-center" style={{ background: squad.card, borderColor: squad.border, boxShadow: cardShadow }}>
            <div
              className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl"
              style={{ background: alpha(squad.accent, 0.12), color: squad.accent }}
            >
              <Bell className="size-5" />
            </div>
            <div className="text-[14px] font-black">No notifications yet.</div>
            <p className="mt-2 text-[12px] leading-relaxed" style={{ color: squad.textMuted }}>
              New payment routing events and verification updates will show up here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {notifications.map((notification) => {
              const Icon = iconFor(notification.type);

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => actions.readNotification(notification.id)}
                  className="rounded-[22px] border p-4 text-left transition-transform active:scale-[0.98]"
                  style={{
                    background: notification.unread ? "#FFF4FA" : squad.card,
                    borderColor: notification.unread ? alpha(squad.accent, 0.22) : squad.border,
                    boxShadow: cardShadow,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl"
                      style={{ background: alpha(notification.type.includes("payment") ? squad.accent : squad.subtle, 0.12), color: notification.type.includes("payment") ? squad.accent : squad.subtle }}
                    >
                      <Icon className="size-4.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-[13px] font-black">{notification.title}</div>
                        <span className="text-[10px] font-semibold" style={{ color: squad.textFaint }}>
                          {timeLabel(notification.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: squad.textMuted }}>
                        {notification.body}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: squad.textFaint }}>
                          {notification.type.replace(/_/g, " ")}
                        </span>
                        {notification.unread ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black"
                            style={{ background: alpha(squad.accent, 0.12), color: squad.accent }}
                          >
                            <CheckCheck className="size-3" />
                            Read
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
    </ScreenFrame>
  );
}
