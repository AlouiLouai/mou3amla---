import { mou3amla } from "@/features/mou3amla/constants";

/** Generic pill-style segmented toggle - the same visual pattern
 * HandoffModeToggle uses for QR-vs-Nearby, generalized so the Host-vs-Connect
 * sub-toggle inside nearby mode can reuse it without hardcoding that toggle's
 * fixed two-value type. */
export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="mb-4 flex gap-1 rounded-full border p-1" style={{ background: mou3amla.card, borderColor: mou3amla.border }}>
      {options.map((option) => {
        const active = option.value === value;
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
