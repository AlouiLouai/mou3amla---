import type { ReactNode } from "react";
import { BadgeCheck, Bell, ChevronRight, CreditCard, Landmark, LogOut, ShieldAlert, Smartphone } from "lucide-react";
import { BottomNav } from "@/features/squad/components/bottom-nav";
import { ScreenFrame } from "@/features/squad/components/screen-frame";
import { alpha, cardShadow, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";

function verificationTone(status: string) {
  if (status === "verified") return { bg: alpha("#15A46B", 0.12), color: "#12885A", label: "Verified profile" };
  if (status === "pending") return { bg: alpha("#D28B11", 0.14), color: "#B6790E", label: "Verification in review" };
  if (status === "rejected") return { bg: alpha(squad.destructive, 0.12), color: squad.destructive, label: "Action required" };
  return { bg: alpha(squad.accent, 0.1), color: squad.accent, label: "Not verified" };
}

export function ProfileScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { derived, actions } = squadApp;
  const account = derived.account;
  const initials = account.profile.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const verification = verificationTone(account.profile.verificationStatus);
  const isVerificationSyncing =
    account.profile.verificationStatus === "pending" && Boolean(account.profile.diditSessionId);
  const header = (
    <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
      <div className="text-[1.3rem] font-black tracking-tight">Profile</div>
    </div>
  );
  const footer = (
    <BottomNav active="profile" onHome={actions.goHome} onSend={actions.goGenerateIntent} onActivity={actions.goActivity} onProfile={actions.goProfile} />
  );

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-4 pb-4">
        <div className="mb-4 rounded-[28px] border px-5 py-5" style={{ background: squad.card, borderColor: squad.border, boxShadow: cardShadow }}>
          <div className="mb-4 flex items-center gap-4">
            <div
              className="flex size-16 items-center justify-center rounded-full border text-lg font-black"
              style={{ background: squad.cardAlt, borderColor: alpha(squad.accent, 0.18), color: squad.accent }}
            >
              {initials || "SQ"}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[1.05rem] font-black">{account.profile.fullName || "SQUAD user"}</div>
              <div className="mt-1 text-[12px] font-semibold" style={{ color: squad.textMuted }}>
                @{account.profile.username}
              </div>
              {account.profile.phone ? (
                <div className="mt-1 text-[11px] font-medium" style={{ color: squad.textFaint }}>
                  {account.profile.phone}
                </div>
              ) : null}
            </div>
          </div>

          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-black"
            style={{ background: verification.bg, color: verification.color }}
          >
            <BadgeCheck className="size-4" />
            <span>{verification.label}</span>
          </div>
          {isVerificationSyncing ? (
            <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: squad.subtle }}>
              Didit status refresh is running in the background.
            </div>
          ) : null}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <InfoTile label="Destinations" value={String(account.wallets.length)} />
          <InfoTile label="Unread alerts" value={String(derived.unreadNotifications)} />
        </div>

        <div className="mb-4 flex flex-col gap-2">
          <LinkCard
            href="/verify-identity"
            icon={<Landmark className="size-4" style={{ color: squad.accent }} />}
            label="Identity verification"
            value={account.profile.verificationStatus}
          />
          <ActionCard
            icon={<Bell className="size-4" style={{ color: squad.accent }} />}
            label="Notification center"
            value={`${derived.unreadNotifications} unread`}
            onClick={actions.goNotifications}
          />
          <ActionCard
            icon={<CreditCard className="size-4" style={{ color: squad.accent }} />}
            label="Payment routes"
            value={derived.sourceWallet?.name ?? "None"}
            onClick={actions.goHome}
          />
        </div>

        <div className="mb-4 rounded-[24px] border p-4" style={{ background: squad.cardAlt, borderColor: alpha(squad.accent, 0.15) }}>
          <div className="mb-2 flex items-center gap-2">
            <Smartphone className="size-4" style={{ color: squad.accent }} />
            <span className="text-[12px] font-black">Mobile-first identity</span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: squad.textMuted }}>
            Your phone, handle, verification status, and public routing destinations stay synced with Supabase.
          </p>
        </div>

        <div className="mb-4 rounded-[24px] border p-4" style={{ background: squad.cardAlt, borderColor: alpha(squad.accent, 0.15) }}>
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert className="size-4" style={{ color: squad.accent }} />
            <span className="text-[12px] font-black">Zero-liability routing</span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: squad.textMuted }}>
            SQUAD never holds your funds. Even after verification, the final transfer still executes in your bank or wallet app.
          </p>
        </div>

        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center justify-between rounded-[22px] border px-4 py-3 text-left"
            style={{ background: squad.card, borderColor: alpha(squad.destructive, 0.22), boxShadow: cardShadow }}
          >
            <span className="flex items-center gap-2.5 text-[13px] font-semibold" style={{ color: squad.destructive }}>
              <LogOut className="size-4" />
              Log out
            </span>
          </button>
        </form>
    </ScreenFrame>
  );
}

function LinkCard({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-[22px] border px-4 py-3 text-left"
      style={{ background: squad.card, borderColor: squad.border, boxShadow: cardShadow }}
    >
      <span className="flex items-center gap-2.5 text-[13px] font-semibold">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-1 text-xs font-bold capitalize" style={{ color: squad.textFaint }}>
        {value} <ChevronRight className="size-3.5" />
      </span>
    </a>
  );
}

function ActionCard({
  icon,
  label,
  value,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-[22px] border px-4 py-3 text-left"
      style={{ background: squad.card, borderColor: squad.border, boxShadow: cardShadow }}
    >
      <span className="flex items-center gap-2.5 text-[13px] font-semibold">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-1 text-xs font-bold capitalize" style={{ color: squad.textFaint }}>
        {value} <ChevronRight className="size-3.5" />
      </span>
    </button>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border px-4 py-4" style={{ background: squad.card, borderColor: squad.border, boxShadow: cardShadow }}>
      <div className="text-[11px] font-semibold" style={{ color: squad.textMuted }}>
        {label}
      </div>
      <div className="mt-1 text-[13px] font-black">{value}</div>
    </div>
  );
}
