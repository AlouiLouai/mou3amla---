import { ArrowRight, ChevronLeft, Delete, ScanFace } from "lucide-react";
import { alpha, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";
import { WalletIcon } from "@/features/squad/components/wallet-icon";

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export function TransferScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { state, derived, actions } = squadApp;
  const step = state.transferStep;
  const isSend = state.transferRole === "send";
  const amountDisplay = state.amount || "0";
  const transmitColor = isSend ? squad.green : squad.purple;
  const receiptFrom = isSend ? `${derived.sourceWallet.name} Wallet` : "Ahmed K. · Flouci Wallet";
  const receiptTo = isSend ? "Ahmed K. · Ooredoo Wallet" : "Ooredoo Wallet";

  return (
    <div className="flex flex-1 flex-col overflow-auto px-6 pt-[max(1.125rem,env(safe-area-inset-top))] pb-8">
      {step === "input" && (
        <button
          type="button"
          onClick={actions.goHome}
          className="mb-4.5 flex size-8 items-center justify-center rounded-[9px] border"
          style={{ background: squad.card, borderColor: "rgba(255,255,255,0.08)" }}
        >
          <ChevronLeft className="size-4" />
        </button>
      )}

      {step === "input" && (
        <>
          <div className="mb-[22px] flex rounded-xl border p-1" style={{ background: squad.card, borderColor: "rgba(255,255,255,0.08)" }}>
            <button
              type="button"
              onClick={actions.setRoleSend}
              className="flex-1 rounded-[9px] py-2.5 text-[13px] font-bold"
              style={{ background: isSend ? squad.green : "transparent", color: isSend ? "#06110B" : "rgba(244,245,246,0.5)" }}
            >
              Send
            </button>
            <button
              type="button"
              onClick={actions.setRoleReceive}
              className="flex-1 rounded-[9px] py-2.5 text-[13px] font-bold"
              style={{ background: !isSend ? squad.green : "transparent", color: !isSend ? "#06110B" : "rgba(244,245,246,0.5)" }}
            >
              Receive
            </button>
          </div>

          {isSend ? (
            <>
              <div className="mb-2 text-[11px] font-semibold tracking-wide" style={{ color: "rgba(244,245,246,0.45)" }}>
                FROM WALLET
              </div>
              <div className="mb-[22px] flex flex-wrap gap-2">
                {state.wallets.map((wallet) => {
                  const selected = wallet.id === state.sourceWalletId;
                  return (
                    <button
                      key={wallet.id}
                      type="button"
                      onClick={() => actions.selectSource(wallet.id)}
                      className="flex items-center gap-1.5 rounded-[10px] border px-3 py-2"
                      style={{
                        background: selected ? alpha(wallet.color, 0.14) : squad.card,
                        borderColor: selected ? wallet.color : "rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        className="flex size-4.5 items-center justify-center rounded-[5px] text-[8px] font-extrabold"
                        style={{ background: alpha(wallet.color, 0.14), color: wallet.color }}
                      >
                        <WalletIcon id={wallet.id} initials={wallet.initials} color={wallet.color} className="size-[10px]" />
                      </div>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: selected ? squad.text : "rgba(244,245,246,0.6)" }}
                      >
                        {wallet.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div className="font-mono text-[44px] font-semibold">
                  {amountDisplay} <span className="text-xl" style={{ color: squad.green }}>DT</span>
                </div>
                <button
                  type="button"
                  onClick={actions.quickAmount5}
                  className="mt-3.5 rounded-full border px-3.5 py-1.5 text-xs font-bold"
                  style={{ color: squad.green, background: alpha(squad.green, 0.1), borderColor: alpha(squad.green, 0.3) }}
                >
                  +5 DT quick
                </button>
              </div>

              <div className="my-4.5 grid grid-cols-3 gap-2.5">
                {KEYPAD_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => (k === "⌫" ? actions.keypadBackspace() : actions.keypadPress(k))}
                    className="flex items-center justify-center rounded-xl border py-3.5 text-lg font-semibold"
                    style={{ background: squad.card, borderColor: "rgba(255,255,255,0.07)" }}
                  >
                    {k === "⌫" ? <Delete className="size-4.5" /> : k}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={actions.initiateBeam}
                className="rounded-xl py-[15px] text-[15px] font-bold"
                style={{ background: parseFloat(state.amount) > 0 ? squad.green : alpha(squad.green, 0.3), color: "#06110B" }}
              >
                Initiate Beam
              </button>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div
                className="mb-5 flex size-21 items-center justify-center rounded-full border"
                style={{ background: alpha(squad.green, 0.1), borderColor: alpha(squad.green, 0.35) }}
              >
                <div className="h-8 w-5.5 rounded-full border-[2.2px]" style={{ borderColor: squad.green }} />
              </div>
              <div className="mb-2 text-[17px] font-extrabold">Ready to Receive</div>
              <div className="mb-[26px] max-w-[250px] text-[13px] leading-relaxed" style={{ color: "rgba(244,245,246,0.5)" }}>
                Hold your device near the sender and start listening for the ultrasonic token.
              </div>
              <button
                type="button"
                onClick={actions.startListening}
                className="w-full rounded-xl py-[15px] text-[15px] font-bold"
                style={{ background: squad.green, color: "#06110B" }}
              >
                Start Listening
              </button>
            </div>
          )}
        </>
      )}

      {step === "transmit" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative mb-[26px] flex size-[180px] items-center justify-center">
            {[0, 0.6, 1.2].map((delay) => (
              <div
                key={delay}
                className="absolute size-full animate-[squad-pulse-ring_1.8s_ease-out_infinite] rounded-full border-2"
                style={{ borderColor: transmitColor, animationDelay: `${delay}s` }}
              />
            ))}
            <div
              className="z-10 flex size-19 items-center justify-center rounded-full border"
              style={{ background: "#101114", borderColor: "rgba(255,255,255,0.1)" }}
            >
              <div className="size-6.5 rounded-full border-[2.2px]" style={{ borderColor: transmitColor }} />
            </div>
          </div>
          <div className="mb-2.5 text-[15px] font-bold">
            {isSend ? "Transmitting encrypted token…" : "Scanning 18.5 kHz spectrum…"}
          </div>
          <div className="mb-2.5 flex h-5 items-end gap-[3px]">
            {[0, 0.1, 0.2, 0.3, 0.4].map((delay) => (
              <div
                key={delay}
                className="w-[3px] animate-[squad-bars_0.6s_ease-in-out_infinite] rounded-sm"
                style={{ height: "100%", background: transmitColor, animationDelay: `${delay}s` }}
              />
            ))}
          </div>
          <div className="font-mono text-[11px]" style={{ color: "rgba(244,245,246,0.4)" }}>
            18.5 kHz · encrypted token
          </div>
          <button
            type="button"
            onClick={actions.cancelTransmit}
            className="mt-[26px] text-[12.5px] font-semibold"
            style={{ color: "rgba(244,245,246,0.4)" }}
          >
            Cancel
          </button>
        </div>
      )}

      {step === "handshake" && (
        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-[30px] text-center text-[15px] font-bold">Establishing Handshake</div>
          <div className="flex flex-col px-2.5">
            {derived.handshakeLabels.map((label, i) => {
              const isDone = i < state.handshakeIndex;
              const isActive = i === state.handshakeIndex;
              const hasLine = i < derived.handshakeLabels.length - 1;
              return (
                <div key={label} className="flex items-start gap-3.5">
                  <div className="flex flex-col items-center">
                    <div
                      className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.6px]"
                      style={{
                        background: isDone ? squad.green : "transparent",
                        borderColor: isDone ? squad.green : isActive ? alpha(squad.green, 0.3) : "rgba(255,255,255,0.15)",
                      }}
                    >
                      {isDone && <div className="h-1.5 w-2.5 -translate-y-px rotate-[-45deg] border-b-2 border-l-2" style={{ borderColor: "#06110B" }} />}
                      {isActive && (
                        <div className="size-full animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: squad.green }} />
                      )}
                    </div>
                    {hasLine && (
                      <div className="h-8.5 w-0.5" style={{ background: isDone ? squad.green : "rgba(255,255,255,0.1)" }} />
                    )}
                  </div>
                  <div className="pt-0.5 pb-5">
                    <div
                      className="text-[13.5px] font-semibold"
                      style={{ color: isDone || isActive ? squad.text : "rgba(244,245,246,0.35)" }}
                    >
                      {label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === "biometric" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <button
            type="button"
            onClick={actions.authenticateBio}
            className="mb-6 flex size-[130px] animate-[squad-glow_2.2s_ease-in-out_infinite] items-center justify-center rounded-full border-[1.6px]"
            style={{ background: "#101114", borderColor: alpha(squad.green, 0.4) }}
          >
            <ScanFace className="size-16" style={{ color: squad.green }} />
          </button>
          <div className="mb-1.5 text-base font-bold">Confirm with Face ID</div>
          <div className="mb-[26px] text-[12.5px]" style={{ color: "rgba(244,245,246,0.5)" }}>
            Authorize {amountDisplay} DT transfer
          </div>
          <button
            type="button"
            onClick={actions.authenticateBio}
            className="w-full rounded-xl py-[15px] text-[15px] font-bold"
            style={{ background: squad.green, color: "#06110B" }}
          >
            Authenticate
          </button>
        </div>
      )}

      {step === "success" && (
        <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden text-center">
          {state.confetti.map((c, i) => (
            <div
              key={i}
              className="absolute -top-5 h-1.5 w-1.5 animate-[squad-fall_2s_linear_infinite] rounded-[1px]"
              style={{ left: c.left, background: c.color, animationDuration: c.dur, animationDelay: c.delay }}
            />
          ))}
          <div
            className="z-10 mb-4.5 flex size-[78px] animate-[squad-glow_2s_ease-in-out_infinite] items-center justify-center rounded-full border"
            style={{ background: alpha(squad.green, 0.12), borderColor: alpha(squad.green, 0.4) }}
          >
            <div className="h-3.5 w-5.5 -translate-y-0.5 rotate-[-45deg] border-b-[3px] border-l-[3px]" style={{ borderColor: squad.green }} />
          </div>
          <div className="z-10 mb-4.5 text-[19px] font-extrabold">
            {isSend ? "Transfer Complete" : "Funds Received"}
          </div>

          <div className="z-10 w-full rounded-2xl border p-5" style={{ background: squad.card, borderColor: "rgba(255,255,255,0.09)" }}>
            <div className="mb-4 font-mono text-[30px] font-semibold">
              {amountDisplay} <span className="text-[15px]" style={{ color: squad.green }}>DT</span>
            </div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-left">
                <div className="mb-1 text-[9.5px] tracking-wide" style={{ color: "rgba(244,245,246,0.4)" }}>
                  FROM
                </div>
                <div className="text-[12.5px] font-bold">{receiptFrom}</div>
              </div>
              <ArrowRight className="size-4" style={{ color: squad.green }} />
              <div className="text-right">
                <div className="mb-1 text-[9.5px] tracking-wide" style={{ color: "rgba(244,245,246,0.4)" }}>
                  TO
                </div>
                <div className="text-[12.5px] font-bold">{receiptTo}</div>
              </div>
            </div>
            <div
              className="mt-1.5 flex items-center justify-between border-t pt-2.5"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <span className="font-mono text-[10.5px]" style={{ color: "rgba(244,245,246,0.35)" }}>
                {state.txId}
              </span>
              <span className="text-[10.5px]" style={{ color: "rgba(244,245,246,0.35)" }}>
                via TUNPAY
              </span>
            </div>
          </div>

          <div className="z-10 mt-4.5 flex w-full gap-2.5">
            <button
              type="button"
              onClick={actions.shareReceipt}
              className="flex-1 rounded-xl border py-3.5 text-[13.5px] font-semibold"
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
            >
              Share Receipt
            </button>
            <button
              type="button"
              onClick={actions.doneTransfer}
              className="flex-1 rounded-xl py-3.5 text-[13.5px] font-bold"
              style={{ background: squad.green, color: "#06110B" }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
