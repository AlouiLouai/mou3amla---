import { Check, X } from "lucide-react";
import { alpha, raisedShadow, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";
import type { AccountId } from "@/features/squad/types";

const ACCOUNT_ORDER: AccountId[] = ["me", "ahmed"];

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Demo-only affordance: SQUAD has exactly one real identity per person in
 * production. This lets one browser preview both sides of a payment (switch
 * to Ahmed, request/pay, switch back to see it land) without a second
 * device or a backend — see docs/06-conventions.md.
 */
export function AccountSwitcherSheet({ squadApp }: { squadApp: UseSquadApp }) {
  const { state, actions } = squadApp;

  if (!state.accountSwitcherOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={actions.closeAccountSwitcher}
        className="fixed inset-0 z-40 backdrop-blur-sm"
        style={{ background: "rgba(5,6,8,0.65)" }}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-[28px] border border-b-0 px-5 pt-4.5 pb-[max(1.75rem,env(safe-area-inset-bottom))] animate-[squad-fadeup_0.25s_ease_both]"
        style={{ background: squad.card, borderColor: squad.borderStrong, boxShadow: raisedShadow }}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[15px] font-bold">Preview as</div>
          <button
            type="button"
            onClick={actions.closeAccountSwitcher}
            className="flex size-[26px] items-center justify-center rounded-full"
            style={{ background: squad.cardAlt, color: squad.textMuted }}
          >
            <X className="size-3.5" />
          </button>
        </div>
        <p className="mb-4 text-[11.5px] leading-relaxed" style={{ color: squad.textMuted }}>
          Demo only — switch accounts to see both sides of a payment.
        </p>

        <div className="flex flex-col gap-2">
          {ACCOUNT_ORDER.map((id) => {
            const account = state.accounts[id];
            const isActive = state.activeAccountId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => actions.switchAccount(id)}
                className="flex items-center gap-3 rounded-2xl border p-3.5 text-left"
                style={{
                  background: isActive ? alpha(squad.accent, 0.1) : squad.cardAlt,
                  borderColor: isActive ? alpha(squad.accent, 0.35) : squad.border,
                }}
              >
                <div
                  className="flex size-10 items-center justify-center rounded-full text-[13px] font-bold"
                  style={{ background: squad.card, color: squad.accent }}
                >
                  {initialsOf(account.profile.fullName) || "SQ"}
                </div>
                <div className="flex-1">
                  <div className="text-[13.5px] font-bold">{account.profile.fullName}</div>
                  <div className="font-mono text-[11px]" style={{ color: squad.textMuted }}>
                    @{account.profile.username} {id === "me" ? "· You" : "· Demo contact"}
                  </div>
                </div>
                {isActive && <Check className="size-4" style={{ color: squad.accent }} />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
