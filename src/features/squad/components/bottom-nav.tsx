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

const NAV_ITEMS = [
  { key: "home" as const, label: "Home", icon: Home },
  { key: "generate-intent" as const, label: "Send", icon: Send },
  { key: "activity" as const, label: "Activity", icon: Activity },
  { key: "profile" as const, label: "Profile", icon: CircleUserRound },
] as const;

export function BottomNav({ active, onHome, onSend, onActivity, onProfile }: BottomNavProps) {
  const handlers = {
    home: onHome,
    "generate-intent": onSend,
    activity: onActivity,
    profile: onProfile,
  } as const;

  return (
    <div className="px-3 pt-2 pb-[max(0.95rem,env(safe-area-inset-bottom))]" style={{ background: squad.surface }}>
      <div
        className="overflow-x-auto rounded-[28px] border bg-white/96 p-2"
        style={{ borderColor: squad.border, boxShadow: cardShadow }}
      >
        <div className="flex min-w-max gap-1">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const onClick = handlers[key];
          const isActive = active === key;

          return (
            <button
              key={key}
              type="button"
              onClick={onClick}
              className="flex min-w-[76px] flex-1 flex-col items-center gap-1 rounded-[20px] px-3 py-2 transition-transform active:scale-[0.97]"
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
    </div>
  );
}
