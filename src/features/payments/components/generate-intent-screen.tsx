"use client";

import { Camera, Delete, Loader2, Send, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { AppHeader } from "@/features/mou3amla/components/app-header";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { useRecipientSearch } from "@/features/payments/hooks/use-recipient-search";
import { WalletIcon } from "@/features/wallets/components/wallet-icon";
import { PROVIDERS } from "@/features/wallets/constants";

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"];

export function GenerateIntentScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { state, derived, actions } = mou3amlaApp;
  const searchEnabled = !state.recipientPreview && state.recipientInput.trim().length >= 2;
  const { results: recipientResults, isSearching } = useRecipientSearch(state.recipientInput, searchEnabled);
  const account = derived.account;
  const sourceWallet = derived.sourceWallet;
  const sourceProvider = sourceWallet ? PROVIDERS.find((provider) => provider.id === sourceWallet.providerId) ?? null : null;
  const amountDisplay = state.amount || "0";
  const recipientVerified = !state.recipientPreview || state.recipientPreview.verificationStatus === "verified";
  const checkoutSupported = sourceProvider?.demoCheckoutStatus === "supported";
  const canGenerate =
    derived.hasAnyWallets &&
    Number.parseFloat(state.amount) > 0 &&
    state.recipientInput.trim().length > 0 &&
    recipientVerified &&
    checkoutSupported &&
    !state.isSendingPayment;
  const header = (
    <AppHeader
      profile={account.profile}
      unreadNotifications={derived.unreadNotifications}
      onNotifications={actions.goNotifications}
      onBack={actions.goHome}
    />
  );
  const footer = renderAppFooter("generate-intent", actions);

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-4 pb-6">
      {!derived.hasAnyWallets ? (
        <div
          className="mb-4 rounded-2xl border p-4 text-[12px] leading-relaxed"
          style={{ background: mou3amla.card, borderColor: mou3amla.border, color: mou3amla.textMuted }}
        >
          Link at least one account on the dashboard before creating a payment intent.
        </div>
      ) : null}

      {sourceWallet && !checkoutSupported ? (
        <div
          className="mb-4 rounded-2xl border p-4 text-[12px] leading-relaxed"
          style={{
            background: alpha(mou3amla.subtle, 0.08),
            borderColor: alpha(mou3amla.subtle, 0.24),
            color: mou3amla.textMuted,
          }}
        >
          {sourceWallet.name} stays visible in the BCT story, but today only Flouci and Konnect are wired to a live sandbox checkout.
        </div>
      ) : null}

      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <div>
          <div className="mb-2 text-[11px] font-semibold tracking-wide" style={{ color: mou3amla.textMuted }}>
            FROM
          </div>
          <div
            className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border px-2 py-2"
            style={{ background: mou3amla.card, borderColor: mou3amla.borderStrong }}
          >
            {account.wallets.map((wallet) => {
              const selected = wallet.id === account.sourceWalletId;
              return (
                <button
                  key={wallet.id}
                  type="button"
                  onClick={() => actions.selectSource(wallet.id)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 transition-colors"
                  style={{
                    background: selected ? alpha(wallet.color, 0.16) : "transparent",
                    borderColor: selected ? wallet.color : mou3amla.border,
                  }}
                >
                  <div
                    className="flex size-4 items-center justify-center rounded-full text-[8px] font-extrabold"
                    style={{ background: alpha(wallet.color, 0.16), color: wallet.color }}
                  >
                    <WalletIcon id={wallet.providerId} initials={wallet.initials} className="size-[9px]" />
                  </div>
                  <span className="whitespace-nowrap text-[11px] font-semibold" style={{ color: selected ? mou3amla.text : mou3amla.textMuted }}>
                    {wallet.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold tracking-wide" style={{ color: mou3amla.textMuted }}>
            TO
          </div>
          <div
            className="flex items-center gap-1.5 rounded-2xl border px-3 py-2"
            style={{ background: mou3amla.card, borderColor: mou3amla.borderStrong }}
          >
            <span className="font-mono text-[14px]" style={{ color: mou3amla.accent }}>
              @
            </span>
            <input
              value={state.recipientInput.replace(/^@/, "")}
              onChange={(e) => actions.onRecipientChange(e.target.value)}
              placeholder="username"
              className="min-w-0 flex-1 border-none bg-transparent font-mono text-[13.5px] outline-none"
              style={{ color: mou3amla.text }}
            />
            <button
              type="button"
              onClick={() => actions.goScanQr()}
              aria-label="Scan QR"
              className="flex size-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: alpha(mou3amla.accent, 0.1), color: mou3amla.accent }}
            >
              <Camera className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {searchEnabled && (isSearching || recipientResults.length > 0) ? (
        <div
          className="mb-4 overflow-hidden rounded-[20px] border"
          style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
        >
          {isSearching && recipientResults.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3.5 text-[12px]" style={{ color: mou3amla.textMuted }}>
              <Loader2 className="size-3.5 animate-spin" />
              Searching Mou3amla users...
            </div>
          ) : (
            recipientResults.map((result) => (
              <button
                key={result.userId}
                type="button"
                onClick={() => actions.selectRecipient(result)}
                className="flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left last:border-b-0"
                style={{ borderColor: mou3amla.border }}
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-black">{result.displayName}</div>
                  <div className="text-[11px] font-semibold" style={{ color: mou3amla.textMuted }}>
                    @{result.username}
                  </div>
                </div>
                {result.verificationStatus === "verified" ? (
                  <ShieldCheck className="size-4 shrink-0" style={{ color: mou3amla.accent }} />
                ) : (
                  <TriangleAlert className="size-4 shrink-0" style={{ color: mou3amla.subtle }} />
                )}
              </button>
            ))
          )}
        </div>
      ) : null}

      {state.recipientPreview ? (
        <div
          className="mb-4 rounded-[22px] border p-4"
          style={{
            background: recipientVerified ? mou3amla.cardAlt : alpha(mou3amla.destructive, 0.05),
            borderColor: recipientVerified ? alpha(mou3amla.accent, 0.2) : alpha(mou3amla.destructive, 0.24),
            boxShadow: cardShadow,
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-black">{state.recipientPreview.displayName}</div>
              <div className="text-[11px] font-semibold" style={{ color: mou3amla.textMuted }}>
                @{state.recipientPreview.username}
              </div>
            </div>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black capitalize"
              style={{
                background: recipientVerified ? alpha(mou3amla.accent, 0.12) : alpha(mou3amla.destructive, 0.12),
                color: recipientVerified ? mou3amla.accent : mou3amla.destructive,
              }}
            >
              {recipientVerified ? <ShieldCheck className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
              {state.recipientPreview.verificationStatus}
            </span>
          </div>
          <div className="text-[11px] leading-relaxed" style={{ color: recipientVerified ? mou3amla.textMuted : mou3amla.destructive }}>
            {recipientVerified
              ? (state.recipientPreview.primaryRouteLabel ?? "The recipient has no default public route yet.")
              : "This recipient hasn't completed identity verification yet - sending is disabled until they do."}
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2">
          <div className="font-mono text-[42px] font-semibold tracking-tight">
            {amountDisplay}{" "}
            <span className="text-xl" style={{ color: mou3amla.accent }}>
              DT
            </span>
          </div>
          {state.amount ? (
            <button
              type="button"
              onClick={actions.clearAmount}
              aria-label="Clear amount"
              className="flex size-7 items-center justify-center rounded-full"
              style={{ background: alpha(mou3amla.text, 0.08), color: mou3amla.textMuted }}
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={actions.quickAmount5}
          className="mt-3 rounded-full border px-3.5 py-1.5 text-xs font-bold"
          style={{ color: mou3amla.accent, background: alpha(mou3amla.accent, 0.1), borderColor: alpha(mou3amla.accent, 0.3) }}
        >
          +5 DT quick
        </button>
      </div>

      <div className="my-4 grid grid-cols-3 gap-2">
        {KEYPAD_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => (key === "backspace" ? actions.keypadBackspace() : actions.keypadPress(key))}
            className="flex items-center justify-center rounded-2xl border py-3.5 text-lg font-semibold transition-transform active:scale-95"
            style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
          >
            {key === "backspace" ? <Delete className="size-4.5" /> : key}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={actions.generateIntent}
        disabled={!canGenerate}
        aria-label="Send via TUNPAY"
        className="mx-auto flex size-16 items-center justify-center rounded-full transition-opacity disabled:opacity-40"
        style={{ background: mou3amla.accent, color: "#FFFFFF", boxShadow: cardShadow }}
      >
        {state.isSendingPayment ? <Loader2 className="size-6 animate-spin" /> : <Send className="size-6" />}
      </button>
    </ScreenFrame>
  );
}
