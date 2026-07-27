import { SegmentedToggle } from "@/features/payments/components/segmented-toggle";
import type { HandoffMode } from "@/features/mou3amla/types";

export type { HandoffMode };

const OPTIONS: Array<{ value: HandoffMode; label: string }> = [
  { value: "qr", label: "QR code" },
  { value: "nearby", label: "Nearby (AirDrop)" },
];

export function HandoffModeToggle({ mode, onChange }: { mode: HandoffMode; onChange: (mode: HandoffMode) => void }) {
  return <SegmentedToggle value={mode} onChange={onChange} options={OPTIONS} />;
}
