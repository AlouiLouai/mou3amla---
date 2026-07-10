import { Activity, Home, Send, CircleUserRound } from "lucide-react";
import { squad } from "@/features/squad/constants";
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
    { key: "transfer" as const, label: "Send", icon: Send, onClick: onSend },
    { key: "activity" as const, label: "Activity", icon: Activity, onClick: onActivity },
    { key: "profile" as const, label: "Profile", icon: CircleUserRound, onClick: onProfile },
  ];

  return (
    <div
      className="flex items-center justify-around border-t px-3 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      style={{ borderColor: "rgba(255,255,255,0.08)", background: squad.surface }}
    >
      {items.map(({ key, label, icon: Icon, onClick }) => {
        const isActive = active === key;
        const color = isActive ? squad.green : "rgba(244,245,246,0.4)";
        return (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className="flex flex-col items-center gap-1"
            style={{ color }}
          >
            <Icon className="size-5" strokeWidth={1.8} />
            <span className="text-[10px] font-bold">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
