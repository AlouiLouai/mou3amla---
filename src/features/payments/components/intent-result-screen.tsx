import { ArrowRight, Check } from "lucide-react";
import { alpha, cardShadow, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";
import { buildGatewayUrl } from "@/features/payments/lib/tunpay";

export function IntentResultScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { state, derived, actions } = squadApp;
  const intent = state.currentIntent;

  if (!intent) return null;

  const sourceWallet = derived.account.wallets.find((w) => w.id === intent.sourceWalletId);

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 pb-8 text-center">
      {state.confetti.map((c, i) => (
        <div
          key={i}
          className="absolute -top-5 h-1.5 w-1.5 animate-[squad-fall_2s_linear_infinite] rounded-[1px]"
          style={{ left: c.left, background: c.color, animationDuration: c.dur, animationDelay: c.delay }}
        />
      ))}

      <div
        className="z-10 mb-4.5 flex size-[78px] animate-[squad-glow_2s_ease-in-out_infinite] items-center justify-center rounded-full border"
        style={{ background: alpha(squad.accent, 0.14), borderColor: alpha(squad.accent, 0.4) }}
      >
        <Check className="size-8" style={{ color: squad.accent }} />
      </div>
      <div className="z-10 mb-2 text-[19px] font-extrabold tracking-tight">Payment intent created.</div>
      <div className="z-10 mb-5 max-w-[280px] text-[12.5px] leading-relaxed" style={{ color: squad.textMuted }}>
        SQUAD saved the route and handed it to your banking rail. The actual transfer still completes in the bank or
        wallet app.
      </div>

      <div className="z-10 w-full rounded-3xl border p-5" style={{ background: squad.card, borderColor: squad.border, boxShadow: cardShadow }}>
        <div className="mb-4 font-mono text-[30px] font-semibold tracking-tight">
          {intent.amount.toFixed(3)}{" "}
          <span className="text-[15px]" style={{ color: squad.accent }}>
            DT
          </span>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-left">
            <div className="mb-1 text-[9.5px] tracking-wide" style={{ color: squad.textFaint }}>
              FROM
            </div>
            <div className="text-[12.5px] font-bold">{sourceWallet?.name ?? "Wallet"}</div>
          </div>
          <ArrowRight className="size-4" style={{ color: squad.accent }} />
          <div className="text-right">
            <div className="mb-1 text-[9.5px] tracking-wide" style={{ color: squad.textFaint }}>
              TO
            </div>
            <div className="text-[12.5px] font-bold">{intent.recipient}</div>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between border-t pt-2.5" style={{ borderColor: squad.border }}>
          <span className="font-mono text-[10.5px]" style={{ color: squad.textFaint }}>
            {intent.refId}
          </span>
          <span className="text-[10.5px] uppercase" style={{ color: squad.textFaint }}>
            {intent.status}
          </span>
        </div>
      </div>

      <a
        href={buildGatewayUrl(intent)}
        target="_blank"
        rel="noopener noreferrer"
        className="z-10 mt-4 text-[12.5px] font-semibold underline underline-offset-4"
        style={{ color: squad.accent }}
      >
        Open the web gateway if your banking app did not launch
      </a>

      <div className="z-10 mt-4.5 flex w-full gap-2.5">
        <button
          type="button"
          onClick={actions.shareReceipt}
          className="flex-1 rounded-2xl border py-3.5 text-[13.5px] font-semibold"
          style={{ borderColor: squad.borderStrong }}
        >
          Share Receipt
        </button>
        <button
          type="button"
          onClick={actions.doneIntent}
          className="flex-1 rounded-2xl py-3.5 text-[13.5px] font-bold"
          style={{ background: squad.accent, color: "#FFFFFF" }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
