import { Activity, CircleUserRound, Home, Send } from "lucide-react";
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
  const items = [
    { key: "home" as const, label: "Home", icon: Home, onClick: onHome },
    { key: "generate-intent" as const, label: "Send", icon: Send, onClick: onSend },
    { key: "activity" as const, label: "Activity", icon: Activity, onClick: onActivity },
    { key: "profile" as const, label: "Profile", icon: CircleUserRound, onClick: onProfile },
  ];

  return (
    <div className="px-3 pt-2 pb-[max(0.95rem,env(safe-area-inset-bottom))]" style={{ background: squad.surface }}>
      <div
        className="grid grid-cols-4 gap-1 rounded-[28px] border bg-white/96 p-2"
        style={{ borderColor: squad.border, boxShadow: cardShadow }}
      >
        {items.map(({ key, label, icon: Icon, onClick }) => {
          const isActive = active === key;

          return (
            <button
              key={key}
              type="button"
              onClick={onClick}
              className="flex flex-col items-center gap-1 rounded-[20px] py-2 transition-transform active:scale-[0.97]"
              style={{
                background: isActive ? alpha(squad.accent, 0.11) : "transparent",
                color: isActive ? squad.accent : squad.textFaint,
              }}
            >
              <Icon className="size-[18px]" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-black">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
