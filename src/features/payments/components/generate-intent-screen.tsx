"use client";

import { useState } from "react";
import { Delete, Loader2, ScanLine, Send, ShieldCheck, TriangleAlert, UserSearch, Users, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AppHeader } from "@/features/mou3amla/components/app-header";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { BCT_SANDBOX_TEST_LIMIT_TND, TOURIST_CURRENCIES, type TouristCurrencyCode } from "@/features/payments/constants";
import { useRecipientSearch } from "@/features/payments/hooks/use-recipient-search";
import { WalletIcon } from "@/features/wallets/components/wallet-icon";

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"];
const TOURIST_QUICK_AMOUNTS = [20, 50, 100];

export function GenerateIntentScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { state, derived, actions } = mou3amlaApp;
  const searchEnabled = !state.recipientPreview && state.recipientInput.trim().length >= 2;
  const { results: recipientResults, isSearching, hasSearched } = useRecipientSearch(state.recipientInput, searchEnabled);
  const account = derived.account;
  const sourceWallet = derived.sendSourceWallet;
  const isTourist = account.profile.accountType === "tourist";

  // A visiting tourist thinks in their own currency, not TND - the keypad
  // still only ever drives `state.amount` (the real TND value everything
  // downstream - the BCT cap check, createPaymentIntent, activity log -
  // already assumes), but for a tourist it's *derived* from this local
  // foreign-currency input instead of being typed directly. Residents never
  // see this: `currency` stays "TND" and the keypad behaves exactly as
  // before, untouched.
  const [currency, setCurrency] = useState<TouristCurrencyCode>(isTourist ? "EUR" : "TND");
  const [foreignAmountRaw, setForeignAmountRaw] = useState("");
  const isForeignInput = currency !== "TND";

  const applyForeignAmount = (rawValue: string, forCurrency: TouristCurrencyCode) => {
    const rate = TOURIST_CURRENCIES[forCurrency].rateToTnd;
    const tnd = Number(((Number.parseFloat(rawValue) || 0) * rate).toFixed(3));
    actions.setQuickAmount(tnd);
  };

  // Switching currency mid-entry resets the amount rather than reconverting
  // it - "50" typed as EUR and "50" typed as TND are two different amounts
  // typed with different intent, not the same number carried across a unit
  // change.
  const handleCurrencyChange = (nextCurrency: TouristCurrencyCode) => {
    setCurrency(nextCurrency);
    setForeignAmountRaw("");
    actions.clearAmount();
  };

  const handleForeignKeypadPress = (digit: string) => {
    if (digit === "." && foreignAmountRaw.includes(".")) return;
    if (foreignAmountRaw.length >= 6) return;
    const next = foreignAmountRaw + digit;
    setForeignAmountRaw(next);
    applyForeignAmount(next, currency);
  };

  const handleForeignBackspace = () => {
    const next = foreignAmountRaw.slice(0, -1);
    setForeignAmountRaw(next);
    applyForeignAmount(next, currency);
  };

  const handleForeignQuickAmount = (amount: number) => {
    setForeignAmountRaw(String(amount));
    applyForeignAmount(String(amount), currency);
  };

  const handleForeignClear = () => {
    setForeignAmountRaw("");
    actions.clearAmount();
  };

  const amountDisplay = isForeignInput ? foreignAmountRaw || "0" : state.amount || "0";
  const recipientVerified = !state.recipientPreview || state.recipientPreview.verificationStatus === "verified";
  const senderVerified = account.profile.verificationStatus === "verified";
  const parsedAmount = Number.parseFloat(state.amount);
  const exceedsSandboxCap = parsedAmount > BCT_SANDBOX_TEST_LIMIT_TND;
  const canGenerate =
    derived.supportedSendWallets.length > 0 &&
    parsedAmount > 0 &&
    !exceedsSandboxCap &&
    state.recipientInput.trim().length > 0 &&
    recipientVerified &&
    senderVerified &&
    !!sourceWallet &&
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

      {derived.supportedSendWallets.length === 0 ? (
        <div
          className="mb-4 rounded-2xl border p-4 text-[12px] leading-relaxed"
          style={{
            background: alpha(mou3amla.subtle, 0.08),
            borderColor: alpha(mou3amla.subtle, 0.24),
            color: mou3amla.textMuted,
          }}
        >
          Link one of the currently available wallets or bank routes to open Mou3amla&apos;s checkout flow. Flouci opens its real hosted
          sandbox checkout; Konnect is down for the moment in this demo.
        </div>
      ) : account.wallets.length > derived.supportedSendWallets.length ? (
        <div
          className="mb-4 rounded-2xl border p-4 text-[12px] leading-relaxed"
          style={{
            background: alpha(mou3amla.subtle, 0.08),
            borderColor: alpha(mou3amla.subtle, 0.24),
            color: mou3amla.textMuted,
          }}
        >
          Most rails open Mou3amla&apos;s internal TUNPAY-style mock checkout; Flouci opens its real hosted sandbox checkout. Konnect (down
          for the moment) stays visible as a reference-only route.
        </div>
      ) : null}

      <div className="mb-3">
        <div className="mb-2 text-[11px] font-semibold tracking-wide" style={{ color: mou3amla.textMuted }}>
          FROM
        </div>
        <div
          className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border px-2 py-2"
          style={{ background: mou3amla.card, borderColor: mou3amla.borderStrong }}
        >
          {derived.supportedSendWallets.map((wallet) => {
            const selected = wallet.id === state.sendSourceWalletId;
            return (
              <button
                key={wallet.id}
                type="button"
                onClick={() => actions.selectSendSource(wallet.id)}
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

      <div className="mb-3">
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
            <ScanLine className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        {derived.recentContacts.length > 0 ? (
          derived.recentContacts.map((contact) => {
            const selected = state.recipientInput === contact.username;
            return (
              <button
                key={contact.handle}
                type="button"
                onClick={() => actions.onRecipientChange(contact.username)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5"
                style={{
                  background: selected ? alpha(mou3amla.accent, 0.12) : mou3amla.card,
                  borderColor: selected ? mou3amla.accent : mou3amla.border,
                }}
              >
                <div
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white"
                  style={{ background: contact.color }}
                >
                  {contact.initials}
                </div>
                <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: mou3amla.text }}>
                  @{contact.username}
                </span>
              </button>
            );
          })
        ) : (
          <div
            className="flex w-full items-center gap-2 rounded-2xl border border-dashed px-3 py-2.5 text-[11px] font-semibold"
            style={{ borderColor: mou3amla.borderStrong, color: mou3amla.textFaint }}
          >
            <Users className="size-3.5 shrink-0" />
            No one yet - send your first payment and they&apos;ll show up here for quick pick.
          </div>
        )}
      </div>

      {searchEnabled && (isSearching || recipientResults.length > 0 || hasSearched) ? (
        <div
          className="mb-4 overflow-hidden rounded-[20px] border"
          style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
        >
          {isSearching && recipientResults.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3.5 text-[12px]" style={{ color: mou3amla.textMuted }}>
              <Loader2 className="size-3.5 animate-spin" />
              Searching Mou3amla users...
            </div>
          ) : recipientResults.length === 0 ? (
            <EmptyState
              className="rounded-none border-none"
              icon={<UserSearch className="size-5" />}
              title="No matching users"
              body="Double-check the @username, or ask them for their exact handle."
            />
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
        {isTourist ? (
          <div className="mb-3 flex items-center gap-1.5 rounded-full border p-1" style={{ background: mou3amla.card, borderColor: mou3amla.border }}>
            {(Object.keys(TOURIST_CURRENCIES) as TouristCurrencyCode[]).map((code) => {
              const selected = currency === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleCurrencyChange(code)}
                  className="rounded-full px-3 py-1.5 text-[11px] font-black transition-colors"
                  style={{ background: selected ? mou3amla.accent : "transparent", color: selected ? "#FFFFFF" : mou3amla.textMuted }}
                >
                  {TOURIST_CURRENCIES[code].symbol} {code}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <div className="font-mono text-[42px] font-semibold tracking-tight">
            {amountDisplay}{" "}
            <span className="text-xl" style={{ color: mou3amla.accent }}>
              {TOURIST_CURRENCIES[currency].symbol}
            </span>
          </div>
          {(isForeignInput ? foreignAmountRaw : state.amount) ? (
            <button
              type="button"
              onClick={isForeignInput ? handleForeignClear : actions.clearAmount}
              aria-label="Clear amount"
              className="flex size-7 items-center justify-center rounded-full"
              style={{ background: alpha(mou3amla.text, 0.08), color: mou3amla.textMuted }}
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        {isForeignInput ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: mou3amla.textMuted }}>
            <span>
              ≈ {state.amount || "0"} DT
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[8.5px] font-black uppercase tracking-[0.1em]"
              style={{ background: alpha(mou3amla.subtle, 0.14), color: mou3amla.subtle }}
            >
              Demo rate
            </span>
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-2">
          {(isForeignInput ? TOURIST_QUICK_AMOUNTS : [5, 10, 20]).map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => (isForeignInput ? handleForeignQuickAmount(quick) : actions.setQuickAmount(quick))}
              className="rounded-full border px-3.5 py-1.5 text-xs font-bold"
              style={{ color: mou3amla.accent, background: alpha(mou3amla.accent, 0.1), borderColor: alpha(mou3amla.accent, 0.3) }}
            >
              +{quick} {TOURIST_CURRENCIES[currency].symbol}
            </button>
          ))}
        </div>
        <div
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em]"
          style={{
            color: exceedsSandboxCap ? mou3amla.destructive : mou3amla.textMuted,
            background: exceedsSandboxCap ? alpha(mou3amla.destructive, 0.1) : alpha(mou3amla.subtle, 0.08),
            borderColor: exceedsSandboxCap ? alpha(mou3amla.destructive, 0.3) : alpha(mou3amla.subtle, 0.24),
          }}
        >
          <ShieldCheck className="size-3" />
          BCT Test Limit: Max {BCT_SANDBOX_TEST_LIMIT_TND} TND
          {isForeignInput
            ? ` (~${Math.floor(BCT_SANDBOX_TEST_LIMIT_TND / TOURIST_CURRENCIES[currency].rateToTnd)} ${currency})`
            : ""}{" "}
          / transaction
        </div>

        {/* Contrast Effect: the 0-fee claim only lands next to something to
            compare it against - shown side by side rather than in isolation,
            same "Free P2P Routing" language already used in the mock
            checkout's order summary (app/dev/mock-checkout/page.tsx). No
            specific bank commission figure is invented here (see
            docs/07-agent-guardrails.md #12) - the contrast is qualitative. */}
        <div className="mt-2 flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 rounded-full border px-3 py-1"
            style={{ background: alpha(mou3amla.accent, 0.12), borderColor: alpha(mou3amla.accent, 0.3) }}
          >
            <ShieldCheck className="size-3" style={{ color: mou3amla.accent }} />
            <span className="text-[10px] font-black" style={{ color: mou3amla.accent }}>
              Mou3amla: 0.000 TND fee
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1 opacity-50" style={{ borderColor: mou3amla.borderStrong }}>
            <span className="text-[10px] font-semibold line-through" style={{ color: mou3amla.textFaint }}>
              Traditional bank transfer: fees apply
            </span>
          </div>
        </div>
      </div>

      <div className="my-4 grid grid-cols-3 gap-2">
        {KEYPAD_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (key === "backspace") {
                if (isForeignInput) handleForeignBackspace();
                else actions.keypadBackspace();
                return;
              }
              if (isForeignInput) handleForeignKeypadPress(key);
              else actions.keypadPress(key);
            }}
            className="flex items-center justify-center rounded-2xl border py-3.5 text-lg font-semibold transition-transform active:scale-95"
            style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
          >
            {key === "backspace" ? <Delete className="size-4.5" /> : key}
          </button>
        ))}
      </div>

      <div
        className="mb-3 flex items-center gap-2.5 rounded-2xl border p-3"
        style={{
          background: senderVerified ? mou3amla.cardAlt : alpha(mou3amla.destructive, 0.05),
          borderColor: senderVerified ? alpha(mou3amla.accent, 0.2) : alpha(mou3amla.destructive, 0.24),
        }}
      >
        {senderVerified ? (
          <ShieldCheck className="size-4.5 shrink-0" style={{ color: mou3amla.accent }} />
        ) : (
          <TriangleAlert className="size-4.5 shrink-0" style={{ color: mou3amla.destructive }} />
        )}
        <p className="text-[11px] leading-relaxed" style={{ color: senderVerified ? mou3amla.textMuted : mou3amla.destructive }}>
          {senderVerified
            ? `You're KYC-verified as ${account.profile.fullName} (@${account.profile.username}) - this checkout will show you as the confirmed sender.`
            : "Complete your own identity verification before you can send a payment."}
        </p>
      </div>

      <button
        type="button"
        onClick={actions.generateIntent}
        disabled={!canGenerate}
        className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-[14px] font-black transition-opacity disabled:opacity-40"
        style={{ background: mou3amla.accent, color: "#FFFFFF", boxShadow: cardShadow }}
      >
        {state.isSendingPayment ? <Loader2 className="size-4.5 animate-spin" /> : <Send className="size-4.5" />}
        {sourceWallet?.providerId === "konnect" ? "Open Konnect Checkout" : "Open Mock Checkout"}
      </button>
    </ScreenFrame>
  );
}
