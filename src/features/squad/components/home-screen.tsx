import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Bell, CreditCard, Landmark, QrCode, ScanLine, Send, ShieldCheck, Sparkles } from "lucide-react";
import { alpha, cardShadow, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";
import { BottomNav } from "@/features/squad/components/bottom-nav";
import { WalletRegistrySheet } from "@/features/wallets/components/wallet-registry-sheet";
import { WalletIcon } from "@/features/wallets/components/wallet-icon";
import { maskRoutingValue, ROUTING_LABELS } from "@/features/wallets/lib/routing";

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function verificationCopy(status: string) {
  if (status === "verified") {
    return {
      title: "Identity verified",
      body: "Your profile is trusted and ready for RIB linking.",
      icon: ShieldCheck,
      tone: "#1DAA62",
    };
  }

  if (status === "pending") {
    return {
      title: "Verification in review",
      body: "Didit is reviewing your file. High-trust features unlock right after approval.",
      icon: Sparkles,
      tone: squad.subtle,
    };
  }

  if (status === "rejected") {
    return {
      title: "Verification needs retry",
      body: "Restart the Didit flow to unlock bank account linking and higher-trust routes.",
      icon: ShieldCheck,
      tone: squad.destructive,
    };
  }

  return {
    title: "Verify to unlock more",
    body: "Complete identity verification to enable RIB linking and trusted QR routing.",
    icon: ShieldCheck,
    tone: squad.accent,
  };
}

export function HomeScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { derived, actions } = squadApp;
  const account = derived.account;
  const firstName = account.profile.fullName.split(" ")[0] || "SQUAD";
  const verification = verificationCopy(account.profile.verificationStatus);
  const VerificationIcon = verification.icon;
  const latestNotification = account.notifications[0] ?? null;
  const initials = account.profile.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto px-4 pt-[max(0.85rem,env(safe-area-inset-top))] pb-3">
        <div
          className="relative mb-4 overflow-hidden rounded-[32px] px-4 pt-4 pb-5 text-white"
          style={{ background: squad.hero, boxShadow: "0 28px 70px rgba(0,0,0,0.22)" }}
        >
          <div
            className="pointer-events-none absolute -top-12 right-[-34px] h-36 w-36 rounded-full"
            style={{ background: "linear-gradient(135deg, rgba(255,0,131,0.95), rgba(255,141,40,0.86))", filter: "blur(8px)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-12 left-[-36px] h-32 w-32 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,141,40,0.34), transparent 68%)" }}
          />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/62">Welcome</div>
              <div className="mt-2 text-[1.55rem] font-black leading-none">{firstName}!</div>
              <div className="mt-1 text-[12px] font-medium text-white/66">{timeGreeting()}</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={actions.openLink}
                className="rounded-full bg-white/12 px-3 py-2 text-[11px] font-black text-white backdrop-blur"
              >
                + Link
              </button>
              <button
                type="button"
                onClick={actions.goNotifications}
                className="relative flex size-10 items-center justify-center rounded-full border border-white/14 bg-white/8 text-white backdrop-blur"
              >
                <Bell className="size-4.5" />
                {derived.unreadNotifications > 0 ? (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full px-1 text-center text-[9px] font-black"
                    style={{ background: squad.accent, color: "#FFFFFF" }}
                  >
                    {Math.min(derived.unreadNotifications, 9)}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <div className="relative mt-4 rounded-[26px] bg-white p-3 text-black">
            <div className="flex items-center gap-3">
              <div
                className="flex size-11 items-center justify-center rounded-[18px] text-[12px] font-black"
                style={{ background: alpha(squad.accent, 0.1), color: squad.accent }}
              >
                {initials || "SQ"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-black">@{account.profile.username}</div>
                <div className="text-[11px] font-medium" style={{ color: squad.textMuted }}>
                  {account.wallets.length} route{account.wallets.length === 1 ? "" : "s"} linked
                </div>
              </div>
            </div>

            <div
              className="mt-3 rounded-[22px] px-3 py-3"
              style={{ background: verification.tone === squad.accent ? "#FFF3F9" : alpha(verification.tone, 0.09) }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex size-9 items-center justify-center rounded-2xl"
                    style={{ background: alpha(verification.tone, 0.12), color: verification.tone }}
                  >
                    <VerificationIcon className="size-4.5" />
                  </div>
                  <div>
                    <div className="text-[13px] font-black">{verification.title}</div>
                    <p className="mt-1 text-[11px] leading-relaxed" style={{ color: squad.textMuted }}>
                      {verification.body}
                    </p>
                  </div>
                </div>

                {account.profile.verificationStatus !== "verified" ? (
                  <Link href="/verify-identity" className="shrink-0" style={{ color: squad.accent }}>
                    <ArrowRight className="size-4.5" />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <ActionCard
            label="Send money"
            body="Route a payment"
            icon={<Send className="size-5" />}
            tone="accent"
            onClick={actions.goGenerateIntent}
          />
          <ActionCard
            label="Scan QR"
            body="Find a recipient"
            icon={<ScanLine className="size-5" />}
            tone="dark"
            onClick={actions.goScanQr}
          />
          <ActionCard
            label="Receive"
            body="Create your QR"
            icon={<QrCode className="size-5" />}
            tone="light"
            onClick={actions.goReceiveQr}
          />
          <SummaryCard
            title="Primary route"
            value={derived.sourceWallet ? derived.sourceWallet.name : "None"}
            body={
              derived.sourceWallet
                ? `${ROUTING_LABELS[derived.sourceWallet.routingType]} ${maskRoutingValue(derived.sourceWallet.routingValue)}`
                : "Link a wallet tag, merchant id, or RIB."
            }
            icon={<CreditCard className="size-4.5" style={{ color: squad.accent }} />}
          />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <SummaryCard
            title="RIB unlock"
            value={account.profile.verificationStatus === "verified" ? "Available" : "Locked"}
            body={
              account.profile.verificationStatus === "verified"
                ? "Bank account linking is now available."
                : "Didit approval is required before adding a RIB."
            }
            icon={<Landmark className="size-4.5" style={{ color: squad.subtle }} />}
          />
          <SummaryCard
            title="Alerts"
            value={`${derived.unreadNotifications}`}
            body={latestNotification?.title ?? "No fresh alerts right now."}
            icon={<Bell className="size-4.5" style={{ color: squad.accent }} />}
            actionLabel="Open"
            onAction={actions.goNotifications}
          />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <div className="text-[13px] font-black">Linked destinations</div>
          <button type="button" onClick={actions.openLink} className="text-[11px] font-black" style={{ color: squad.accent }}>
            Add new
          </button>
        </div>

        {!derived.hasAnyWallets ? (
          <div
            className="mb-4 rounded-[24px] border px-4 py-5"
            style={{ background: squad.card, borderColor: squad.border, boxShadow: cardShadow }}
          >
            <div className="text-[14px] font-black">No linked destination yet.</div>
            <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: squad.textMuted }}>
              Start with a wallet tag or merchant id. After Didit approval, you can also attach a 20-digit RIB.
            </p>
          </div>
        ) : null}

        <div className="mb-4 flex flex-col gap-2.5">
          {account.wallets.map((wallet) => {
            const isDefault = wallet.id === account.sourceWalletId;

            return (
              <button
                key={wallet.id}
                type="button"
                onClick={() => actions.selectSource(wallet.id)}
                className="rounded-[22px] border p-3.5 text-left transition-transform active:scale-[0.98]"
                style={{
                  background: isDefault ? "#FFF3F9" : squad.card,
                  borderColor: isDefault ? alpha(squad.accent, 0.32) : squad.border,
                  boxShadow: cardShadow,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-10 items-center justify-center rounded-[15px]"
                      style={{ background: alpha(wallet.color, 0.14), color: wallet.color }}
                    >
                      <WalletIcon id={wallet.providerId} initials={wallet.initials} className="size-4.5" />
                    </div>
                    <div>
                      <div className="text-[13px] font-black">{wallet.name}</div>
                      <div className="mt-0.5 text-[11px]" style={{ color: squad.textMuted }}>
                        {ROUTING_LABELS[wallet.routingType]} {maskRoutingValue(wallet.routingValue)}
                      </div>
                    </div>
                  </div>

                  {isDefault ? (
                    <span
                      className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em]"
                      style={{ background: squad.accent, color: "#FFFFFF" }}
                    >
                      Live
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <BottomNav active="home" onHome={actions.goHome} onSend={actions.goGenerateIntent} onActivity={actions.goActivity} onProfile={actions.goProfile} />
      <WalletRegistrySheet squadApp={squadApp} />
    </div>
  );
}

function ActionCard({
  label,
  body,
  icon,
  tone,
  onClick,
}: {
  label: string;
  body: string;
  icon: ReactNode;
  tone: "accent" | "dark" | "light";
  onClick: () => void;
}) {
  const styles =
    tone === "accent"
      ? { background: "linear-gradient(135deg, #FF0083, #FF5C9E)", color: "#FFFFFF", borderColor: "transparent" }
      : tone === "dark"
        ? { background: squad.hero, color: "#FFFFFF", borderColor: "transparent" }
        : { background: squad.card, color: squad.text, borderColor: squad.border };

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[24px] border px-3.5 py-4 text-left transition-transform active:scale-[0.98]"
      style={{ ...styles, boxShadow: cardShadow }}
    >
      <div
        className="mb-4 flex size-10 items-center justify-center rounded-[15px]"
        style={{
          background: tone === "light" ? alpha(squad.accent, 0.1) : "rgba(255,255,255,0.14)",
          color: tone === "light" ? squad.accent : "#FFFFFF",
        }}
      >
        {icon}
      </div>
      <div className="text-[13px] font-black">{label}</div>
      <div className="mt-1 text-[11px]" style={{ color: tone === "light" ? squad.textMuted : "rgba(255,255,255,0.76)" }}>
        {body}
      </div>
    </button>
  );
}

function SummaryCard({
  title,
  value,
  body,
  icon,
  actionLabel,
  onAction,
}: {
  title: string;
  value: string;
  body: string;
  icon: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[24px] border p-4" style={{ background: squad.card, borderColor: squad.border, boxShadow: cardShadow }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <div className="text-[12px] font-black">{title}</div>
        </div>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction} className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: squad.accent }}>
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="text-[15px] font-black">{value}</div>
      <div className="mt-1 text-[11px] leading-relaxed" style={{ color: squad.textMuted }}>
        {body}
      </div>
    </div>
  );
}
