"use client";

import { useState } from "react";
import { Landmark, Loader2, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AppHeader } from "@/features/mou3amla/components/app-header";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { WalletIcon } from "@/features/wallets/components/wallet-icon";
import { maskRoutingValue, ROUTING_LABELS } from "@/features/wallets/lib/routing";

// The detailed management view for linked destinations: the home screen's
// wallet stack is a glanceable, physical-wallet-style preview; this screen is
// where a user sees every linked account with its full routing detail, chooses
// the default receive route, and can deliberately remove a destination.
export function AccountsScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { derived, actions } = mou3amlaApp;
  const account = derived.account;
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const header = (
    <AppHeader
      profile={account.profile}
      unreadNotifications={derived.unreadNotifications}
      onNotifications={actions.goNotifications}
    />
  );
  const footer = renderAppFooter("accounts", actions);

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-4 pb-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[15px] font-black tracking-tight">Linked accounts</div>
          <p className="text-[11px] font-semibold" style={{ color: mou3amla.textMuted }}>
            {account.wallets.length} destination{account.wallets.length === 1 ? "" : "s"} - tap a card to set the default receive route
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
        <EmptyState
          icon={<Landmark className="size-5" />}
          title="No linked destination yet"
          body="Start with a wallet tag or merchant id. After verification approval, you can also attach a 20-digit RIB."
          action={{ label: "Link an account", onClick: actions.openLink }}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {account.wallets.map((wallet) => {
            const isDefault = wallet.id === account.sourceWalletId;
            const isConfirmingDelete = confirmingDeleteId === wallet.id;
            const isDeleting = deletingId === wallet.id;

            return (
              <div
                key={wallet.id}
                className="rounded-[22px] border p-3.5 text-left transition-transform active:scale-[0.98]"
                style={{
                  background: isDefault ? alpha(mou3amla.accent, 0.1) : mou3amla.card,
                  borderColor: isDefault ? alpha(mou3amla.accent, 0.32) : mou3amla.border,
                  boxShadow: cardShadow,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => actions.selectSource(wallet.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <div
                      className="flex size-10 items-center justify-center rounded-[15px]"
                      style={{ background: alpha(wallet.color, 0.14), color: wallet.color }}
                    >
                      <WalletIcon id={wallet.providerId} initials={wallet.initials} className="size-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-black">{wallet.name}</div>
                      <div className="mt-0.5 text-[11px]" style={{ color: mou3amla.textMuted }}>
                        {ROUTING_LABELS[wallet.routingType]} {maskRoutingValue(wallet.routingValue)}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    {isDefault ? (
                      <span
                        className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em]"
                        style={{ background: mou3amla.accent, color: "#FFFFFF" }}
                      >
                        Default
                      </span>
                    ) : null}

                    <button
                      type="button"
                      aria-label={`Delete ${wallet.name}`}
                      onClick={() => setConfirmingDeleteId((current) => (current === wallet.id ? null : wallet.id))}
                      className="flex size-9 items-center justify-center rounded-full border transition-colors"
                      style={{
                        borderColor: alpha(mou3amla.destructive, 0.24),
                        background: isConfirmingDelete ? alpha(mou3amla.destructive, 0.12) : alpha(mou3amla.destructive, 0.06),
                        color: mou3amla.destructive,
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {isConfirmingDelete ? (
                  <div
                    className="mt-3 rounded-[18px] border p-3"
                    style={{
                      background: alpha(mou3amla.destructive, 0.04),
                      borderColor: alpha(mou3amla.destructive, 0.18),
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full"
                        style={{ background: alpha(mou3amla.destructive, 0.12), color: mou3amla.destructive }}
                      >
                        <ShieldAlert className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-black">Remove this linked destination?</div>
                        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
                          {isDefault
                            ? account.wallets.length > 1
                              ? "This is your current default receive route. Mou3amla will switch incoming routing to another linked account immediately."
                              : "This is your only linked destination. After deletion, your @username will stop routing incoming payments until you link another account."
                            : "This removes the destination from Mou3amla only. It does not close the wallet or bank account itself."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(null)}
                        className="rounded-full border px-3 py-1.5 text-[11px] font-black"
                        style={{ borderColor: mou3amla.border, color: mou3amla.text }}
                      >
                        Keep
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => {
                          setDeletingId(wallet.id);
                          void actions.deleteLinkedDestination(wallet.id).finally(() => {
                            setDeletingId(null);
                            setConfirmingDeleteId((current) => (current === wallet.id ? null : current));
                          });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-60"
                        style={{ background: mou3amla.destructive }}
                      >
                        {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                        Delete
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </ScreenFrame>
  );
}
