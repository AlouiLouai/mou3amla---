import { Fingerprint } from "lucide-react";
import { identityGradients, type IdentityGradientId, raisedShadow } from "@/features/mou3amla/constants";
import { formatUsernameHandle } from "@/features/auth/lib/identity";

// Deliberately its own visual object, not a `WalletStack`/`BankCard` reskin -
// those are reserved for real linked bank/wallet provider brand colors (see
// docs/05-styling-ui.md) and must never carry a user-chosen cosmetic
// gradient. This is the user's personal Mou3amla identity card, shown before
// they've linked any real destination.
export function IdentityCardPreview({ username, gradientId, memberLabel }: { username: string; gradientId: IdentityGradientId; memberLabel: string }) {
  const gradient = identityGradients[gradientId];

  return (
    <div
      className="relative overflow-hidden rounded-[20px] p-4 text-white"
      style={{ background: gradient.gradient, boxShadow: raisedShadow, aspectRatio: "8 / 5" }}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/75">Mou3amla</span>
          <Fingerprint className="size-4 text-white/75" />
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/60">{memberLabel}</div>
          <div className="mt-0.5 font-mono text-[17px] font-black drop-shadow-sm">{formatUsernameHandle(username)}</div>
        </div>
      </div>
    </div>
  );
}
