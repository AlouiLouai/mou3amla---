import type { ReactNode } from "react";
import { QrCode, Quote, Send } from "lucide-react";
import { AppHeader } from "@/features/mou3amla/components/app-header";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { alpha, cardShadow, igGradient, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { WalletStack } from "@/features/wallets/components/wallet-stack";

export function HomeScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { derived, actions } = mou3amlaApp;
  const account = derived.account;
  const footer = renderAppFooter("home", actions);
  const header = (
    <AppHeader profile={account.profile} unreadNotifications={derived.unreadNotifications} onNotifications={actions.goNotifications} />
  );

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-4 pb-3">
      <WalletStack
        wallets={account.wallets}
        sourceWalletId={account.sourceWalletId}
        onAddMore={actions.openLink}
        onViewAccounts={actions.goAccounts}
        onSelectWallet={actions.selectSource}
      />

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <ActionCard
          label="Send"
          body="Send money"
          icon={<Send className="size-5" />}
          tone="accent"
          onClick={actions.goGenerateIntent}
        />
        <ActionCard
          label="Receive"
          body="Get paid"
          icon={<QrCode className="size-5" />}
          tone="dark"
          onClick={() => actions.goReceiveQr()}
        />
      </div>

      <div className="mt-5 rounded-[24px] p-4" style={{ background: mou3amla.card }}>
        <Quote className="size-5" style={{ color: mou3amla.accent }} />
        <p className="mt-2 text-[14px] leading-snug font-black text-white">
          Sending money should feel like sending a text.
        </p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/60">
          Mou3amla turns your @username into a TUNPAY routing address - no IBAN, no branch visit, no waiting. Pick a
          contact, confirm the amount, and your bank or wallet app finishes the transfer on the spot.
        </p>
      </div>
    </ScreenFrame>
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
      ? { background: igGradient, color: "#FFFFFF", borderColor: "transparent" }
      : tone === "dark"
        ? { background: mou3amla.card, color: "#FFFFFF", borderColor: mou3amla.border }
        : { background: mou3amla.card, color: mou3amla.text, borderColor: mou3amla.border };

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
          background: tone === "light" ? alpha(mou3amla.accent, 0.1) : "rgba(255,255,255,0.14)",
          color: tone === "light" ? mou3amla.accent : "#FFFFFF",
        }}
      >
        {icon}
      </div>
      <div className="text-[13px] font-black">{label}</div>
      <div className="mt-1 text-[11px]" style={{ color: tone === "light" ? mou3amla.textMuted : "rgba(255,255,255,0.76)" }}>
        {body}
      </div>
    </button>
  );
}
