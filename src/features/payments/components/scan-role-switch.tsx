import { QrCode, Send } from "lucide-react";
import { mou3amla } from "@/features/mou3amla/constants";
import type { ScanRole } from "@/features/payments/lib/last-scan-role";

// Lets a user switch roles (I'm paying / I'm getting paid) with one tap from
// wherever they landed, instead of backing out to Home first - the bottom
// nav's single "scan" tab is inherently ambiguous between the two, so both
// screens need a fast way out if the smart default guessed wrong.
// `hideReceive` is for tourist accounts (see AccountType in auth/types.ts) -
// goReceiveQr already blocks them server-side/in-state regardless, this just
// avoids offering a choice that would only toast-reject on tap.
export function ScanRoleSwitch({ role, onSelect, hideReceive = false }: { role: ScanRole; onSelect: (role: ScanRole) => void; hideReceive?: boolean }) {
  return (
    <div className="mb-3 flex gap-1 rounded-full border p-1" style={{ background: mou3amla.card, borderColor: mou3amla.border }}>
      <button
        type="button"
        onClick={() => onSelect("send")}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[11.5px] font-black transition-colors"
        style={{ background: role === "send" ? mou3amla.accent : "transparent", color: role === "send" ? "#FFFFFF" : mou3amla.textMuted }}
      >
        <Send className="size-3.5" />
        Send
      </button>
      {hideReceive ? null : (
        <button
          type="button"
          onClick={() => onSelect("receive")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[11.5px] font-black transition-colors"
          style={{ background: role === "receive" ? mou3amla.accent : "transparent", color: role === "receive" ? "#FFFFFF" : mou3amla.textMuted }}
        >
          <QrCode className="size-3.5" />
          Receive
        </button>
      )}
    </div>
  );
}
