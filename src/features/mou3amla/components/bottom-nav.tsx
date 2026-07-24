import { Activity, CircleUserRound, Home, ScanLine, Send } from "lucide-react";
import { useScrollCompact } from "@/features/mou3amla/components/screen-frame";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import type { Screen } from "@/features/mou3amla/types";
import { useTranslation } from "@/features/i18n/language-store";
import type { TranslationKey } from "@/features/i18n/translations";

interface BottomNavProps {
  active: Screen;
  onHome: () => void;
  onSend: () => void;
  onScan: () => void;
  onActivity: () => void;
  onProfile: () => void;
}

const NAV_ITEMS = [
  { key: "home" as const, labelKey: "nav.home" as TranslationKey, icon: Home },
  { key: "generate-intent" as const, labelKey: "nav.send" as TranslationKey, icon: Send },
  { key: "scan-qr" as const, labelKey: "nav.scan" as TranslationKey, icon: ScanLine },
  { key: "activity" as const, labelKey: "nav.activity" as TranslationKey, icon: Activity },
  { key: "profile" as const, labelKey: "nav.profile" as TranslationKey, icon: CircleUserRound },
] as const;

export function BottomNav({ active, onHome, onSend, onScan, onActivity, onProfile }: BottomNavProps) {
  const compact = useScrollCompact();
  const { t } = useTranslation();
  const handlers = {
    home: onHome,
    "generate-intent": onSend,
    "scan-qr": onScan,
    activity: onActivity,
    profile: onProfile,
  } as const;

  return (
    <div
      className="flex justify-center px-9 pt-1.5 pb-[max(0.65rem,env(safe-area-inset-bottom))]"
      style={{ background: `linear-gradient(180deg, transparent, ${mou3amla.bg} 60%)` }}
    >
      <div
        className="overflow-hidden rounded-[22px] border p-1 backdrop-blur-xl"
        style={{ background: alpha(mou3amla.card, 0.66), borderColor: mou3amla.border, boxShadow: cardShadow }}
      >
        <div className="flex gap-1">
          {NAV_ITEMS.map(({ key, labelKey, icon: Icon }) => {
            const label = t(labelKey);
            const onClick = handlers[key];
            const isActive = active === key;

            return (
              <button
                key={key}
                type="button"
                onClick={onClick}
                aria-label={label}
                className="flex items-center justify-center rounded-[16px] transition-[background-color,padding,transform] duration-300 ease-out active:scale-[0.97]"
                style={{
                  padding: compact ? "0.5rem 0.55rem" : "0.6rem 0.85rem",
                  background: isActive ? alpha(mou3amla.accent, 0.11) : "transparent",
                  color: isActive ? mou3amla.accent : mou3amla.textFaint,
                }}
              >
                <Icon
                  className="shrink-0 transition-[width,height] duration-300 ease-out"
                  style={{ width: compact ? "16px" : "19px", height: compact ? "16px" : "19px" }}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type FooterActions = Pick<UseMou3amlaApp["actions"], "goHome" | "goGenerateIntent" | "goScanQr" | "goActivity" | "goProfile">;

// Every full-page screen in the authenticated shell shows the same bottom
// nav, not just the five screens it can directly navigate to - this builds
// the ScreenFrame `footer` node once instead of repeating the same
// prop wiring per screen.
export function renderAppFooter(active: Screen, actions: FooterActions) {
  return (
    <BottomNav
      active={active}
      onHome={actions.goHome}
      onSend={actions.goGenerateIntent}
      onScan={() => actions.goScanQr()}
      onActivity={actions.goActivity}
      onProfile={actions.goProfile}
    />
  );
}
