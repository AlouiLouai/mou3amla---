import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { alpha, mou3amla } from "@/features/mou3amla/constants";

const PULSE_RING_DELAYS = [0, 0.6, 1.2];
const CONNECT_DOT_DELAYS = [0, 0.2, 0.4];

/** One "device" in the handoff - pulsing rings while its side hasn't
 * accepted yet (searching/waiting, same visual language as the single-node
 * "publishing" state above this in both screens), a solid filled check once
 * it has. */
function DeviceNode({ accepted, icon }: { accepted: boolean; icon: ReactNode }) {
  return (
    <div className="relative flex size-16 shrink-0 items-center justify-center">
      {!accepted
        ? PULSE_RING_DELAYS.map((delay) => (
            <div
              key={delay}
              className="absolute size-full animate-[mou3amla-pulse-ring_1.8s_ease-out_infinite] rounded-full border-2"
              style={{ borderColor: mou3amla.accent, animationDelay: `${delay}s` }}
            />
          ))
        : null}
      <div
        className="z-10 flex size-12 items-center justify-center rounded-full border transition-colors duration-300"
        style={{
          background: accepted ? mou3amla.accent : mou3amla.card,
          borderColor: accepted ? mou3amla.accent : mou3amla.borderStrong,
          color: accepted ? "#FFFFFF" : mou3amla.textMuted,
        }}
      >
        {accepted ? <Check className="size-5" /> : icon}
      </div>
    </div>
  );
}

/**
 * The AirDrop-style two-device "connecting" visual shown once a nearby code
 * is matched on both `receive-qr-screen.tsx` (owner) and `scan-qr-screen.tsx`
 * (payer), replacing what used to be a plain status card. Each device node
 * pulses independently while its own side hasn't accepted, and the center
 * dots ripple continuously (theirs solid accent once both sides are in).
 */
export function NearbyConnecting({
  selfAccepted,
  otherAccepted,
  selfIcon,
  otherIcon,
  title,
  subtitle,
  acceptLabel,
  waitingLabel,
  cancelLabel,
  onAccept,
  onCancel,
}: {
  selfAccepted: boolean;
  otherAccepted: boolean;
  selfIcon: ReactNode;
  otherIcon: ReactNode;
  title: string;
  subtitle: string;
  acceptLabel: string;
  waitingLabel: string;
  cancelLabel: string;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const bothAccepted = selfAccepted && otherAccepted;

  return (
    <div
      className="w-full rounded-[24px] border p-5 text-center"
      style={{ background: mou3amla.cardAlt, borderColor: alpha(mou3amla.accent, 0.22) }}
    >
      <div className="flex items-center justify-center gap-3">
        <DeviceNode accepted={selfAccepted} icon={selfIcon} />
        <div className="flex items-center gap-1.5" aria-hidden>
          {CONNECT_DOT_DELAYS.map((delay) => (
            <span
              key={delay}
              className="size-1.5 rounded-full animate-[mou3amla-dot-pulse_1.2s_ease-in-out_infinite]"
              style={{ background: bothAccepted ? mou3amla.accent : mou3amla.subtle, animationDelay: `${delay}s` }}
            />
          ))}
        </div>
        <DeviceNode accepted={otherAccepted} icon={otherIcon} />
      </div>

      <div className="mt-4 text-[13px] font-black">{title}</div>
      <p className="mt-1 mb-4 text-[11.5px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
        {subtitle}
      </p>

      <button
        type="button"
        onClick={onAccept}
        disabled={selfAccepted}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[13.5px] font-black disabled:opacity-60"
        style={{ background: mou3amla.accent, color: "#FFFFFF" }}
      >
        {selfAccepted ? waitingLabel : acceptLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="mt-2 w-full text-center text-[11.5px] font-bold"
        style={{ color: mou3amla.textMuted }}
      >
        {cancelLabel}
      </button>
    </div>
  );
}
