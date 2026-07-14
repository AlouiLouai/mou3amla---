import { squad } from "@/features/squad/constants";

export type HandoffMode = "qr" | "nearby";

const OPTIONS: Array<{ value: HandoffMode; label: string }> = [
  { value: "qr", label: "QR code" },
  { value: "nearby", label: "Nearby (AirDrop)" },
];

export function HandoffModeToggle({ mode, onChange }: { mode: HandoffMode; onChange: (mode: HandoffMode) => void }) {
  return (
    <div className="mb-5 flex gap-1 rounded-full border p-1" style={{ background: squad.card, borderColor: squad.border }}>
      {OPTIONS.map((option) => {
        const active = option.value === mode;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="flex-1 rounded-full py-2 text-[11.5px] font-black transition-colors"
            style={{
              background: active ? squad.accent : "transparent",
              color: active ? "#FFFFFF" : squad.textMuted,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
