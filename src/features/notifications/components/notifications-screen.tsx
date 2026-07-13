import { Bell, CheckCheck, ChevronLeft, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
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
    <div className="px-4 pt-[max(0.9rem,env(safe-area-inset-top))] pb-3">
      <div
        className="relative overflow-hidden rounded-[30px] px-4 pt-4 pb-5 text-white"
        style={{ background: squad.hero, boxShadow: "0 16px 40px rgba(0,0,0,0.14)" }}
      >
        <div
          className="pointer-events-none absolute -top-12 right-[-26px] h-32 w-32 rounded-full"
          style={{ background: "linear-gradient(135deg, rgba(255,0,131,0.95), rgba(255,141,40,0.88))" }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={actions.goHome}
              className="flex size-10 items-center justify-center rounded-full border border-white/14 bg-white/10 text-white"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.26em] text-white/60">Notification center</div>
              <div className="mt-2 text-[1.45rem] font-black leading-none">Stay in sync.</div>
            </div>
          </div>

          <button
            type="button"
            onClick={actions.readAllNotifications}
            className="rounded-full bg-white/12 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white"
          >
            Mark read
          </button>
        </div>

        <div className="relative mt-4 rounded-[22px] bg-white px-4 py-3 text-black">
          <div className="text-[13px] font-black">{derived.unreadNotifications} unread alert(s)</div>
          <div className="mt-1 text-[11px] leading-relaxed" style={{ color: squad.textMuted }}>
            Payment routing events, verification updates, and system notices appear here.
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ScreenFrame header={header} contentClassName="px-4 pb-4">
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
