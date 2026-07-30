import { Bell, CheckCheck, CreditCard, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AppHeader } from "@/features/mou3amla/components/app-header";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";

function iconFor(type: string) {
  if (type === "payment_failed") return TriangleAlert;
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

export function NotificationsScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { derived, actions } = mou3amlaApp;
  const notifications = derived.account.notifications;
  const header = (
    <AppHeader
      profile={derived.account.profile}
      unreadNotifications={derived.unreadNotifications}
      onNotifications={actions.goNotifications}
    />
  );
  const footer = renderAppFooter("notifications", actions);

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-4 pb-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[15px] font-black tracking-tight">Notifications</div>
            <div className="text-[11px] font-semibold" style={{ color: mou3amla.textMuted }}>
              {derived.unreadNotifications} unread alert(s)
            </div>
          </div>
          <button
            type="button"
            onClick={actions.readAllNotifications}
            className="rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]"
            style={{ background: alpha(mou3amla.accent, 0.1), color: mou3amla.accent }}
          >
            Mark read
          </button>
        </div>

        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="size-5" />}
            title="No notifications yet"
            body="New payment routing events and verification updates will show up here."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {notifications.map((notification) => {
              const Icon = iconFor(notification.type);
              const tone =
                notification.type === "payment_failed" ? mou3amla.destructive : notification.type.includes("payment") ? mou3amla.accent : mou3amla.subtle;

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => actions.readNotification(notification.id)}
                  className="rounded-[22px] border p-4 text-left transition-transform active:scale-[0.98]"
                  style={{
                    background: notification.unread ? alpha(mou3amla.accent, 0.09) : mou3amla.card,
                    borderColor: notification.unread ? alpha(mou3amla.accent, 0.22) : mou3amla.border,
                    boxShadow: cardShadow,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl"
                      style={{ background: alpha(tone, 0.12), color: tone }}
                    >
                      <Icon className="size-4.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-[13px] font-black">{notification.title}</div>
                        <span className="text-[10px] font-semibold" style={{ color: mou3amla.textFaint }}>
                          {timeLabel(notification.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
                        {notification.body}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: mou3amla.textFaint }}>
                          {notification.type.replace(/_/g, " ")}
                        </span>
                        {notification.unread ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black"
                            style={{ background: alpha(mou3amla.accent, 0.12), color: mou3amla.accent }}
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
