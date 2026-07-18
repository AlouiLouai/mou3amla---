import { Plus } from "lucide-react";
import { AppHeader } from "@/features/mou3amla/components/app-header";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { WalletIcon } from "@/features/wallets/components/wallet-icon";
import { maskRoutingValue, ROUTING_LABELS } from "@/features/wallets/lib/routing";

// The detailed management view for linked destinations - the home screen's
// wallet stack is a glanceable, physical-wallet-style preview; this screen is
// where a user sees every linked account with its full routing detail and
// picks which one is the default send/receive source.
export function AccountsScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { derived, actions } = mou3amlaApp;
  const account = derived.account;
  const header = (
    <AppHeader profile={account.profile} unreadNotifications={derived.unreadNotifications} onNotifications={actions.goNotifications} />
  );
  const footer = renderAppFooter("accounts", actions);

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-4 pb-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[15px] font-black tracking-tight">Linked accounts</div>
          <p className="text-[11px] font-semibold" style={{ color: mou3amla.textMuted }}>
            {account.wallets.length} destination{account.wallets.length === 1 ? "" : "s"} · tap to set as default
          </p>
        </div>
        <button
          type="button"
          onClick={actions.openLink}
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-black text-white"
          style={{ background: mou3amla.accent }}
        >
          <Plus className="size-3.5" />
          Add
        </button>
      </div>

      {account.wallets.length === 0 ? (
        <div
          className="rounded-[24px] border px-4 py-6 text-center"
          style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
        >
          <div className="text-[14px] font-black">No linked destination yet.</div>
          <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
            Start with a wallet tag or merchant id. After verification approval, you can also attach a 20-digit RIB.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {account.wallets.map((wallet) => {
            const isDefault = wallet.id === account.sourceWalletId;

            return (
              <button
                key={wallet.id}
                type="button"
                onClick={() => actions.selectSource(wallet.id)}
                className="rounded-[22px] border p-3.5 text-left transition-transform active:scale-[0.98]"
                style={{
                  background: isDefault ? "#FFF3F9" : mou3amla.card,
                  borderColor: isDefault ? alpha(mou3amla.accent, 0.32) : mou3amla.border,
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
                      <div className="mt-0.5 text-[11px]" style={{ color: mou3amla.textMuted }}>
                        {ROUTING_LABELS[wallet.routingType]} {maskRoutingValue(wallet.routingValue)}
                      </div>
                    </div>
                  </div>

                  {isDefault ? (
                    <span
                      className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em]"
                      style={{ background: mou3amla.accent, color: "#FFFFFF" }}
                    >
                      Default
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </ScreenFrame>
  );
}
