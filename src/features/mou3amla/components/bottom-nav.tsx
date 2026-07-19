import { Activity, CircleUserRound, Home, Send } from "lucide-react";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import type { Screen } from "@/features/mou3amla/types";

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
    <div
      className="flex justify-center px-3 pt-2 pb-[max(0.95rem,env(safe-area-inset-bottom))]"
      style={{ background: "linear-gradient(180deg, transparent, #000000 60%)" }}
    >
      <div
        className="w-full overflow-hidden rounded-[28px] border p-2 backdrop-blur-xl"
        style={{ background: "rgba(18,18,18,0.92)", borderColor: mou3amla.border, boxShadow: cardShadow, maxWidth: "480px" }}
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
                aria-label={label}
                className="flex flex-1 flex-col items-center gap-1 rounded-[20px] px-3 py-2 transition-[background-color,transform] duration-200 active:scale-[0.97]"
                style={{
                  minWidth: "76px",
                  background: isActive ? alpha(mou3amla.accent, 0.11) : "transparent",
                  color: isActive ? mou3amla.accent : mou3amla.textFaint,
                }}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-black whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type FooterActions = Pick<UseMou3amlaApp["actions"], "goHome" | "goGenerateIntent" | "goActivity" | "goProfile">;

// Every full-page screen in the authenticated shell shows the same bottom
// nav, not just the four screens it can directly navigate to - this builds
// the ScreenFrame `footer` node once instead of repeating the same
// four-prop wiring per screen.
export function renderAppFooter(active: Screen, actions: FooterActions) {
  return (
    <BottomNav
      active={active}
      onHome={actions.goHome}
      onSend={actions.goGenerateIntent}
      onActivity={actions.goActivity}
      onProfile={actions.goProfile}
    />
  );
}
