"use client";

import { useEffect, useRef, useState } from "react";
import { List, Plus } from "lucide-react";
import { alpha, raisedShadow, squad } from "@/features/squad/constants";
import { WalletIcon } from "@/features/wallets/components/wallet-icon";
import { maskRoutingValue, ROUTING_LABELS } from "@/features/wallets/lib/routing";
import type { LinkedWallet } from "@/features/wallets/types";

const SETTLE_DEBOUNCE_MS = 120;

function ChipIcon() {
  return (
    <div
      className="flex h-5 w-7 flex-col justify-center gap-[2px] rounded-[4px] px-1"
      style={{ background: "linear-gradient(135deg, #F3E2A9, #C9A961)" }}
      aria-hidden
    >
      <div className="h-[1.5px] w-full rounded-full bg-black/25" />
      <div className="h-[1.5px] w-full rounded-full bg-black/25" />
    </div>
  );
}

function BankCard({ wallet }: { wallet: LinkedWallet }) {
  return (
    <div
      className="relative shrink-0 snap-center overflow-hidden rounded-[20px]"
      style={{ width: "88%", aspectRatio: "8 / 5", boxShadow: raisedShadow }}
    >
      {/* Flat brand-color base, plus a diagonal light-to-dark sheen layered on top for a glossy, embossed card feel without needing per-color math. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, rgba(255,255,255,0.22), rgba(0,0,0,0.16)), ${wallet.color}`,
        }}
      />

      <div className="relative flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-white/90" style={{ color: wallet.color }}>
              <WalletIcon id={wallet.providerId} initials={wallet.initials} className="size-4" />
            </div>
            <span className="text-[13px] font-black text-white drop-shadow-sm">{wallet.name}</span>
          </div>
          <ChipIcon />
        </div>

        <div
          className="font-mono text-[22px] font-bold tracking-[0.08em] text-white"
          style={{ textShadow: "0 1px 1px rgba(0,0,0,0.28), 0 -1px 0 rgba(255,255,255,0.16)" }}
        >
          {maskRoutingValue(wallet.routingValue)}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-[8.5px] font-semibold tracking-[0.12em] text-white/60 uppercase">
              {ROUTING_LABELS[wallet.routingType]}
            </div>
            {wallet.isDefault ? <div className="text-[10px] font-black text-white">Default</div> : null}
          </div>
          <div className="text-[9.5px] font-medium text-white/70">{wallet.network}</div>
        </div>
      </div>
    </div>
  );
}

// An Apple-Wallet-style card carousel for linked destinations: one full,
// realistic bank/wallet card at a time (gradient sheen, chip, masked routing
// value), swiped or tapped between via native scroll-snap. Deliberately never
// shows a balance or aggregated total: SQUAD is zero-liability by design and
// never fetches or stores account balances (see docs/07-agent-guardrails.md),
// so each card only ever surfaces the provider's name and its masked public
// routing tag/RIB.
export function WalletStack({
  wallets,
  sourceWalletId,
  onAddMore,
  onViewAccounts,
  onSelectWallet,
}: {
  wallets: LinkedWallet[];
  sourceWalletId: string;
  onAddMore: () => void;
  onViewAccounts: () => void;
  onSelectWallet: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialIndex = Math.max(
    0,
    wallets.findIndex((wallet) => wallet.id === sourceWalletId),
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || wallets.length === 0) return;

    let settleTimeoutId: ReturnType<typeof setTimeout> | null = null;

    function handleScroll() {
      if (settleTimeoutId !== null) clearTimeout(settleTimeoutId);
      settleTimeoutId = setTimeout(() => {
        const cardWidth = el!.scrollWidth / wallets.length;
        const index = Math.min(wallets.length - 1, Math.max(0, Math.round(el!.scrollLeft / cardWidth)));
        setActiveIndex(index);
        const wallet = wallets[index];
        if (wallet && wallet.id !== sourceWalletId) onSelectWallet(wallet.id);
      }, SETTLE_DEBOUNCE_MS);
    }

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (settleTimeoutId !== null) clearTimeout(settleTimeoutId);
    };
  }, [wallets, sourceWalletId, onSelectWallet]);

  function scrollToIndex(index: number) {
    const el = scrollRef.current;
    const card = el?.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-black" style={{ color: squad.text }}>
          Linked accounts
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onViewAccounts}
            aria-label="View all accounts"
            className="flex size-8 items-center justify-center rounded-full transition-colors"
            style={{ background: alpha(squad.text, 0.06), color: squad.text }}
          >
            <List className="size-4" />
          </button>
          <button
            type="button"
            onClick={onAddMore}
            aria-label="Add an account"
            className="flex size-8 items-center justify-center rounded-full text-white transition-colors"
            style={{ background: squad.accent }}
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {wallets.length === 0 ? (
        <div className="rounded-[22px] border border-dashed px-4 py-6 text-center" style={{ borderColor: squad.borderStrong }}>
          <div className="text-[13px] font-black">No linked destination yet</div>
          <p className="mx-auto mt-1.5 max-w-[240px] text-[11.5px] leading-relaxed" style={{ color: squad.textMuted }}>
            Add a wallet tag, merchant id, or RIB to start sending and receiving.
          </p>
          <button
            type="button"
            onClick={onAddMore}
            className="mt-3 rounded-full px-4 py-2 text-[11.5px] font-black text-white"
            style={{ background: squad.accent }}
          >
            Link an account
          </button>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="squad-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1"
            style={{ scrollPaddingInline: "6%" }}
          >
            {wallets.map((wallet) => (
              <BankCard key={wallet.id} wallet={wallet} />
            ))}
          </div>

          {wallets.length > 1 ? (
            <div className="flex items-center justify-center gap-1.5">
              {wallets.map((wallet, index) => (
                <button
                  key={wallet.id}
                  type="button"
                  onClick={() => scrollToIndex(index)}
                  aria-label={`Show ${wallet.name}`}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: index === activeIndex ? 16 : 6,
                    background: index === activeIndex ? squad.accent : alpha(squad.text, 0.16),
                  }}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
