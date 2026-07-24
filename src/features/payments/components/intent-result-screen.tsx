import { ArrowRight, Check } from "lucide-react";
import { AppHeader } from "@/features/mou3amla/components/app-header";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { buildGatewayUrl } from "@/features/payments/lib/tunpay";

export function IntentResultScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { state, derived, actions } = mou3amlaApp;
  const intent = state.currentIntent;

  if (!intent) return null;

  const sourceWallet = derived.account.wallets.find((w) => w.id === intent.sourceWalletId);
  const header = (
    <AppHeader
      profile={derived.account.profile}
      unreadNotifications={derived.unreadNotifications}
      onNotifications={actions.goNotifications}
    />
  );
  const footer = renderAppFooter("intent-result", actions);

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-4 pb-8">
      <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden text-center">
        {state.confetti.map((c, i) => (
          <div
            key={i}
            className="absolute -top-5 h-1.5 w-1.5 animate-[mou3amla-fall_2s_linear_infinite] rounded-[1px]"
            style={{ left: c.left, background: c.color, animationDuration: c.dur, animationDelay: c.delay }}
          />
        ))}

        <div
          className="z-10 mb-4.5 flex size-[78px] animate-[mou3amla-glow_2s_ease-in-out_infinite] items-center justify-center rounded-full border"
          style={{ background: alpha(mou3amla.accent, 0.14), borderColor: alpha(mou3amla.accent, 0.4) }}
        >
          <Check className="size-8" style={{ color: mou3amla.accent }} />
        </div>
        <div className="z-10 mb-2 text-[19px] font-extrabold tracking-tight">Payment intent created.</div>
        <div className="z-10 mb-5 max-w-[280px] text-[12.5px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
          Mou3amla saved the route and handed it to your banking rail. The actual transfer still completes in the bank or
          wallet app.
        </div>

        <div className="z-10 w-full rounded-3xl border p-5" style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}>
          <div className="mb-4 font-mono text-[30px] font-semibold tracking-tight">
            {intent.amount.toFixed(3)}{" "}
            <span className="text-[15px]" style={{ color: mou3amla.accent }}>
              DT
            </span>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-left">
              <div className="mb-1 text-[9.5px] tracking-wide" style={{ color: mou3amla.textFaint }}>
                FROM
              </div>
              <div className="text-[12.5px] font-bold">{sourceWallet?.name ?? "Wallet"}</div>
            </div>
            <ArrowRight className="size-4" style={{ color: mou3amla.accent }} />
            <div className="text-right">
              <div className="mb-1 text-[9.5px] tracking-wide" style={{ color: mou3amla.textFaint }}>
                TO
              </div>
              <div className="text-[12.5px] font-bold">{intent.recipient}</div>
            </div>
          </div>
          <div className="mt-1.5 flex items-center justify-between border-t pt-2.5" style={{ borderColor: mou3amla.border }}>
            <span className="font-mono text-[10.5px]" style={{ color: mou3amla.textFaint }}>
              {intent.refId}
            </span>
            <span className="text-[10.5px] uppercase" style={{ color: mou3amla.textFaint }}>
              {intent.status}
            </span>
          </div>
        </div>

        <a
          href={buildGatewayUrl(intent)}
          target="_blank"
          rel="noopener noreferrer"
          className="z-10 mt-4 text-[12.5px] font-semibold underline underline-offset-4"
          style={{ color: mou3amla.accent }}
        >
          Open the web gateway if your banking app did not launch
        </a>

        <div className="z-10 mt-4.5 flex w-full gap-2.5">
          <button
            type="button"
            onClick={actions.shareReceipt}
            className="flex-1 rounded-2xl border py-3.5 text-[13.5px] font-semibold"
            style={{ borderColor: mou3amla.borderStrong }}
          >
            Share Receipt
          </button>
          <button
            type="button"
            onClick={actions.doneIntent}
            className="flex-1 rounded-2xl py-3.5 text-[13.5px] font-bold"
            style={{ background: mou3amla.accent, color: "#FFFFFF" }}
          >
            Done
          </button>
        </div>
      </div>
    </ScreenFrame>
  );
}
