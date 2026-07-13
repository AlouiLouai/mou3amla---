import { Activity, Home, Send, CircleUserRound } from "lucide-react";
import { alpha, cardShadow, squad } from "@/features/squad/constants";
import type { Screen } from "@/features/squad/types";

interface BottomNavProps {
  active: Screen;
  onHome: () => void;
  onSend: () => void;
  onActivity: () => void;
  onProfile: () => void;
}

export function BottomNav({ active, onHome, onSend, onActivity, onProfile }: BottomNavProps) {
  const sideItems = [
    { key: "home" as const, label: "Home", icon: Home, onClick: onHome },
    { key: "activity" as const, label: "Activity", icon: Activity, onClick: onActivity },
  ];
  const rightItems = [{ key: "profile" as const, label: "Profile", icon: CircleUserRound, onClick: onProfile }];
  const isPayActive = active === "generate-intent";

  return (
    <div className="px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]" style={{ background: squad.surface }}>
      <div
        className="relative flex items-center justify-between rounded-2xl border px-2 py-1.5"
        style={{ background: squad.card, borderColor: squad.border }}
      >
        <div className="flex flex-1 items-center justify-around">
          {sideItems.map(({ key, label, icon: Icon, onClick }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                type="button"
                onClick={onClick}
                className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 transition-colors"
                style={{ background: isActive ? alpha(squad.accent, 0.12) : "transparent", color: isActive ? squad.accent : squad.textFaint }}
              >
                <Icon className="size-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="text-[10px] font-bold">{label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onSend}
          aria-label="Pay"
          className="relative -top-4 mx-1 flex size-14 shrink-0 items-center justify-center rounded-full border-4 transition-transform active:scale-95"
          style={{ background: squad.accent, borderColor: squad.surface, boxShadow: cardShadow }}
        >
          <Send className="size-5" style={{ color: squad.bg }} strokeWidth={isPayActive ? 2.4 : 2} />
        </button>

        <div className="flex flex-1 items-center justify-around">
          {rightItems.map(({ key, label, icon: Icon, onClick }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                type="button"
                onClick={onClick}
                className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 transition-colors"
                style={{ background: isActive ? alpha(squad.accent, 0.12) : "transparent", color: isActive ? squad.accent : squad.textFaint }}
              >
                <Icon className="size-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="text-[10px] font-bold">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
