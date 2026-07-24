import type { ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Plus, QrCode, Quote, Receipt, ScanLine, Send } from "lucide-react";
import { AppHeader } from "@/features/mou3amla/components/app-header";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { alpha, cardShadow, igGradient, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { WalletStack } from "@/features/wallets/components/wallet-stack";
import { useTranslation } from "@/features/i18n/language-store";

const RECENT_ACTIVITY_PREVIEW_COUNT = 3;

export function HomeScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { derived, actions } = mou3amlaApp;
  const account = derived.account;
  const { t } = useTranslation();
  const footer = renderAppFooter("home", actions);
  const header = (
    <AppHeader
      profile={account.profile}
      unreadNotifications={derived.unreadNotifications}
      onNotifications={actions.goNotifications}
    />
  );

  const startSendTo = (username: string) => {
    actions.goGenerateIntent();
    actions.onRecipientChange(username);
  };

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-4 pb-3">
      <div className="mb-6">
        <SectionHeader title={t("home.quickSend")} onSeeAll={actions.goContacts} seeAllLabel={t("home.seeAll")} />
        <div className="flex items-center gap-4 overflow-x-auto pb-1">
          <button type="button" onClick={actions.goGenerateIntent} className="flex shrink-0 flex-col items-center gap-1.5">
            <div
              className="flex size-13 items-center justify-center rounded-full border-2 border-dashed"
              style={{ borderColor: mou3amla.borderStrong, color: mou3amla.textMuted }}
            >
              <Plus className="size-5" />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: mou3amla.textMuted }}>
              {t("home.new")}
            </span>
          </button>

          {derived.recentContacts.map((contact) => (
            <button
              key={contact.handle}
              type="button"
              onClick={() => startSendTo(contact.username)}
              className="flex shrink-0 flex-col items-center gap-1.5"
            >
              <div className="flex size-13 items-center justify-center rounded-full p-[2px]" style={{ background: igGradient }}>
                <div
                  className="flex size-full items-center justify-center rounded-full text-[13px] font-black text-white"
                  style={{ background: contact.color }}
                >
                  {contact.initials}
                </div>
              </div>
              <span className="max-w-14 truncate text-[10px] font-semibold" style={{ color: mou3amla.textMuted }}>
                {contact.name.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <WalletStack
        wallets={account.wallets}
        sourceWalletId={account.sourceWalletId}
        onAddMore={actions.openLink}
        onViewAccounts={actions.goAccounts}
        onSelectWallet={actions.selectSource}
      />

      <div className="mt-5 grid grid-cols-4 gap-2">
        <QuickAction label={t("home.action.send")} icon={<Send className="size-4.5" />} onClick={actions.goGenerateIntent} />
        <QuickAction label={t("home.action.receive")} icon={<QrCode className="size-4.5" />} onClick={() => actions.goReceiveQr()} />
        <QuickAction label={t("home.action.scan")} icon={<ScanLine className="size-4.5" />} onClick={() => actions.goScanQr()} />
        <QuickAction label={t("home.action.invoices")} icon={<Receipt className="size-4.5" />} onClick={actions.goInvoices} />
      </div>

      <div className="mt-6">
        <SectionHeader title={t("home.recent")} onSeeAll={actions.goActivity} seeAllLabel={t("home.seeAll")} />
        {account.activityLog.length === 0 ? (
          <div
            className="rounded-[22px] border p-4 text-[12px]"
            style={{ background: mou3amla.card, borderColor: mou3amla.border, color: mou3amla.textMuted }}
          >
            {t("home.noActivity")}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {account.activityLog.slice(0, RECENT_ACTIVITY_PREVIEW_COUNT).map((item) => {
              const isSend = item.type === "send";
              const Icon = isSend ? ArrowUpRight : ArrowDownLeft;
              const tone = isSend ? mou3amla.accent : mou3amla.subtle;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={actions.goActivity}
                  className="flex items-center gap-3 rounded-[20px] border p-3 text-left"
                  style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl" style={{ background: alpha(tone, 0.12) }}>
                    <Icon className="size-4" style={{ color: tone }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-black">{isSend ? item.counterparty : `From ${item.counterparty}`}</div>
                    <div className="truncate text-[10.5px] font-semibold" style={{ color: mou3amla.textMuted }}>
                      {item.wallet} · {item.date}
                    </div>
                  </div>
                  <div className="shrink-0 font-mono text-[12.5px] font-bold" style={{ color: tone }}>
                    {isSend ? "-" : "+"}
                    {item.amount.toFixed(3)} DT
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={actions.goGenerateIntent}
        className="mt-6 block w-full rounded-[24px] p-[1.5px] text-left"
        style={{ background: igGradient }}
      >
        <div className="rounded-[22.5px] p-4" style={{ background: mou3amla.card }}>
          <Quote className="size-5" style={{ color: mou3amla.accent }} />
          <p className="mt-2 text-[14px] leading-snug font-black" style={{ color: mou3amla.text }}>
            {t("home.quote.title")}
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
            {t("home.quote.body")}
          </p>
          <span className="mt-3 inline-block rounded-full bg-white px-4 py-2 text-[11.5px] font-black text-black">
            {t("home.quote.cta")}
          </span>
        </div>
      </button>
    </ScreenFrame>
  );
}

function SectionHeader({ title, onSeeAll, seeAllLabel }: { title: string; onSeeAll: () => void; seeAllLabel: string }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <div className="text-[13.5px] font-black tracking-tight">{title}</div>
      <button type="button" onClick={onSeeAll} className="flex items-center gap-0.5 text-[11px] font-bold" style={{ color: mou3amla.accent }}>
        {seeAllLabel}
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  );
}

function QuickAction({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 transition-transform active:scale-95">
      <div
        className="flex size-12 items-center justify-center rounded-2xl"
        style={{ background: alpha(mou3amla.accent, 0.12), color: mou3amla.accent, boxShadow: cardShadow }}
      >
        {icon}
      </div>
      <span className="text-[10.5px] font-bold" style={{ color: mou3amla.textMuted }}>
        {label}
      </span>
    </button>
  );
}
