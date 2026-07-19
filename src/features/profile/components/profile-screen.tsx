import type { ReactNode } from "react";
import { BadgeCheck, Bell, ChevronRight, CreditCard, Landmark, LogOut } from "lucide-react";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { statusToneColor } from "@/features/mou3amla/status-tone";

function verificationTone(status: string, isDemoApproval: boolean) {
  if (status === "verified") {
    const color = statusToneColor("positive");
    return { bg: alpha(color, 0.12), color, label: isDemoApproval ? "Verified profile (demo)" : "Verified profile" };
  }
  if (status === "pending") {
    const color = statusToneColor("pending");
    return { bg: alpha(color, 0.14), color, label: "Verification in review" };
  }
  if (status === "rejected") {
    const color = statusToneColor("negative");
    return { bg: alpha(color, 0.12), color, label: "Action required" };
  }
  const color = statusToneColor("neutral");
  return { bg: alpha(color, 0.1), color, label: "Not verified" };
}

export function ProfileScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { derived, actions } = mou3amlaApp;
  const account = derived.account;
  const initials = account.profile.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const verification = verificationTone(account.profile.verificationStatus, account.profile.kycProviderStatus === "Demo Approved");
  const footer = renderAppFooter("profile", actions);

  return (
    <ScreenFrame footer={footer} contentClassName="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <div className="mb-4 rounded-[28px] border px-5 py-5" style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}>
          <div className="mb-4 flex items-center gap-4">
            <div
              className="flex size-16 items-center justify-center rounded-full border text-lg font-black"
              style={{ background: mou3amla.cardAlt, borderColor: alpha(mou3amla.accent, 0.18), color: mou3amla.accent }}
            >
              {initials || "SQ"}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[1.05rem] font-black">{account.profile.fullName || "Mou3amla user"}</div>
              <div className="mt-1 text-[12px] font-semibold" style={{ color: mou3amla.textMuted }}>
                @{account.profile.username}
              </div>
              {account.profile.phone ? (
                <div className="mt-1 text-[11px] font-medium" style={{ color: mou3amla.textFaint }}>
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
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <InfoTile label="Destinations" value={String(account.wallets.length)} />
          <InfoTile label="Unread alerts" value={String(derived.unreadNotifications)} />
        </div>

        <div className="mb-4 flex flex-col gap-2">
          <LinkCard
            href="/verify-identity"
            icon={<Landmark className="size-4" style={{ color: mou3amla.accent }} />}
            label="Identity verification"
            value={account.profile.verificationStatus}
          />
          <ActionCard
            icon={<Bell className="size-4" style={{ color: mou3amla.accent }} />}
            label="Notification center"
            value={`${derived.unreadNotifications} unread`}
            onClick={actions.goNotifications}
          />
          <ActionCard
            icon={<CreditCard className="size-4" style={{ color: mou3amla.accent }} />}
            label="Payment routes"
            value={derived.sourceWallet?.name ?? "None"}
            onClick={actions.goHome}
          />
        </div>

        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center justify-between rounded-[22px] border px-4 py-3 text-left"
            style={{ background: mou3amla.card, borderColor: alpha(mou3amla.destructive, 0.22), boxShadow: cardShadow }}
          >
            <span className="flex items-center gap-2.5 text-[13px] font-semibold" style={{ color: mou3amla.destructive }}>
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
      style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
    >
      <span className="flex items-center gap-2.5 text-[13px] font-semibold">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-1 text-xs font-bold capitalize" style={{ color: mou3amla.textFaint }}>
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
      style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
    >
      <span className="flex items-center gap-2.5 text-[13px] font-semibold">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-1 text-xs font-bold capitalize" style={{ color: mou3amla.textFaint }}>
        {value} <ChevronRight className="size-3.5" />
      </span>
    </button>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border px-4 py-4" style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}>
      <div className="text-[11px] font-semibold" style={{ color: mou3amla.textMuted }}>
        {label}
      </div>
      <div className="mt-1 text-[13px] font-black">{value}</div>
    </div>
  );
}
