import { Activity, CircleUserRound, Home, Send } from "lucide-react";
import { alpha, cardShadow, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";
import type { Screen } from "@/features/squad/types";

interface BottomNavProps {
  active: Screen;
  onHome: () => void;
  onSend: () => void;
  onActivity: () => void;
  onProfile: () => void;
  /** Compacts to a smaller centered pill (icons only) while the caller is mid-scroll, expanding back to full width at rest - mirrors the Instagram-style tab bar that never fully disappears. */
  compact?: boolean;
}

const NAV_ITEMS = [
  { key: "home" as const, label: "Home", icon: Home },
  { key: "generate-intent" as const, label: "Send", icon: Send },
  { key: "activity" as const, label: "Activity", icon: Activity },
  { key: "profile" as const, label: "Profile", icon: CircleUserRound },
] as const;

export function BottomNav({ active, onHome, onSend, onActivity, onProfile, compact = false }: BottomNavProps) {
  const handlers = {
    home: onHome,
    "generate-intent": onSend,
    activity: onActivity,
    profile: onProfile,
  } as const;

  return (
    <div className="flex justify-center px-3 pt-2 pb-[max(0.95rem,env(safe-area-inset-bottom))]" style={{ background: squad.surface }}>
      <div
        className="w-full overflow-hidden rounded-[28px] border bg-white/96 p-2 transition-[max-width] duration-300 ease-out"
        style={{ borderColor: squad.border, boxShadow: cardShadow, maxWidth: compact ? "208px" : "480px" }}
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
                  minWidth: compact ? "40px" : "76px",
                  background: isActive ? alpha(squad.accent, 0.11) : "transparent",
                  color: isActive ? squad.accent : squad.textFaint,
                }}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                <span
                  className="overflow-hidden text-[10px] font-black whitespace-nowrap transition-[max-height,opacity] duration-200"
                  style={{ maxHeight: compact ? "0px" : "14px", opacity: compact ? 0 : 1 }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type FooterActions = Pick<UseSquadApp["actions"], "goHome" | "goGenerateIntent" | "goActivity" | "goProfile">;

// Every full-page screen in the authenticated shell shows the same bottom
// nav, not just the four screens it can directly navigate to - this builds
// the ScreenFrame `footer` render-prop once instead of repeating the same
// five-prop wiring per screen.
export function renderAppFooter(active: Screen, actions: FooterActions) {
  // Render-prop consumed by ScreenFrame's footer, not a reusable named
  // component - a displayName would never be read anywhere.
  // eslint-disable-next-line react/display-name
  return (compact: boolean) => (
    <BottomNav
      active={active}
      onHome={actions.goHome}
      onSend={actions.goGenerateIntent}
      onActivity={actions.goActivity}
      onProfile={actions.goProfile}
      compact={compact}
    />
  );
}
