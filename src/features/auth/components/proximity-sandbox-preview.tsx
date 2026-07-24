"use client";

import { useState } from "react";
import { ChevronDown, Radar } from "lucide-react";
import { NearbyRadar } from "@/components/ui/nearby-radar";
import { mou3amla } from "@/features/mou3amla/constants";

// Reciprocity: give real product value (a feel for the nearby-handoff radar)
// before the passkey wall, not after. Entirely local/fake data - this never
// calls /api/nearby/**, which requires a session - so it stays honest about
// being a preview rather than quietly probing a real endpoint pre-auth. Real
// "nearby" in the authenticated app is still a simulated BLE-style handoff
// (see docs/07-agent-guardrails.md #11); this sandbox is one layer more
// fictional than that on purpose, and says so in its own copy.
const SANDBOX_PEERS = [
  { handle: "@salma", angle: 20, distance: 30 },
  { handle: "@yassine", angle: 150, distance: 46 },
  { handle: "@nour_b", angle: 250, distance: 38 },
];

export function ProximitySandboxPreview({
  teaserLabel,
  disclaimerLabel,
  peerLabel,
}: {
  teaserLabel: string;
  disclaimerLabel: string;
  peerLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-5 overflow-hidden rounded-[20px] border" style={{ borderColor: mou3amla.border, background: mou3amla.cardAlt }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3"
      >
        <span className="flex items-center gap-2 text-[12px] font-black" style={{ color: mou3amla.text }}>
          <Radar className="size-4" style={{ color: mou3amla.accent }} />
          {teaserLabel}
        </span>
        <ChevronDown className="size-4 shrink-0 transition-transform" style={{ color: mou3amla.textFaint, transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open ? (
        <div className="px-4 pb-4">
          <div className="mb-3">
            <NearbyRadar
              centerIcon={<Radar className="size-4" />}
              size={160}
              blips={SANDBOX_PEERS.map((peer) => ({ id: peer.handle, label: peer.handle, angle: peer.angle, distance: peer.distance }))}
            />
          </div>
          <p className="text-center text-[10.5px] leading-relaxed" style={{ color: mou3amla.textFaint }}>
            {disclaimerLabel}
            <br />
            {peerLabel}
          </p>
        </div>
      ) : null}
    </div>
  );
}
