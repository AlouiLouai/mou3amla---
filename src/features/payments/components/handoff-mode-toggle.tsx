import { mou3amla } from "@/features/mou3amla/constants";
import type { HandoffMode } from "@/features/mou3amla/types";

export type { HandoffMode };

const OPTIONS: Array<{ value: HandoffMode; label: string }> = [
  { value: "qr", label: "QR code" },
  { value: "nearby", label: "Nearby (AirDrop)" },
];

export function HandoffModeToggle({ mode, onChange }: { mode: HandoffMode; onChange: (mode: HandoffMode) => void }) {
  return (
    <div className="mb-5 flex gap-1 rounded-full border p-1" style={{ background: mou3amla.card, borderColor: mou3amla.border }}>
      {OPTIONS.map((option) => {
        const active = option.value === mode;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="flex-1 rounded-full py-2 text-[11.5px] font-black transition-colors"
            style={{
              background: active ? mou3amla.accent : "transparent",
              color: active ? "#FFFFFF" : mou3amla.textMuted,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
