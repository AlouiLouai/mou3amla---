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
  counterpartUsername,
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
  /** The matched counterpart's @username, shown so both sides can visually
   * confirm they matched the physical person they intended before tapping
   * Accept - not just trusting that a 5-digit code happened to line up.
   * Null while still resolving (owner side needs one extra round trip after
   * a fresh claim - see fetchCounterpartUsername in use-qr-nearby-actions.ts). */
  counterpartUsername: string | null;
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
      {counterpartUsername ? (
        <div
          className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black"
          style={{ background: alpha(mou3amla.accent, 0.12), color: mou3amla.accent }}
        >
          Matched with @{counterpartUsername}
        </div>
      ) : null}
      <p className="mt-1 mb-4 text-[11.5px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
        {counterpartUsername
          ? `Double-check that's the right person before you confirm. ${subtitle}`
          : subtitle}
      </p>

      <button
        type="button"
        onClick={onAccept}
        disabled={selfAccepted}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[13.5px] font-black disabled:opacity-60"
        style={{ background: mou3amla.accent, color: "#FFFFFF" }}
      >
        {/* Names the counterpart right on the CTA itself, not just in the
            pill above - the action you're about to take ("accept @username")
            reads as one attractive, personal decision instead of a generic
            button plus a caption to cross-reference. */}
        {selfAccepted ? waitingLabel : counterpartUsername ? `Yes, this is @${counterpartUsername}` : acceptLabel}
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
