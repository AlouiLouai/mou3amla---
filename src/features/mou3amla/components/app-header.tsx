import { Bell, ChevronLeft } from "lucide-react";
import { alpha, igGradient, mou3amla } from "@/features/mou3amla/constants";
import type { UserProfile } from "@/features/mou3amla/types";

// The one header every authenticated screen shares - avatar, greeting, bell.
// Screens no longer own a bespoke back-button header; the bottom nav is the
// way back to Home, so this stays identical everywhere for a consistent,
// tab-app feel instead of a stack of modal-style sub-screens.
//
// `onBack` is a narrow, deliberate exception: on screens reached mid-task
// (send, activity) a back-chevron reads clearer than the avatar/greeting,
// which only makes sense on Home. It still routes to Home under the hood via
// `goHome` - this is a visual swap, not a real navigation stack.
export function AppHeader({
  profile,
  unreadNotifications,
  onNotifications,
  onBack,
}: {
  profile: UserProfile;
  unreadNotifications: number;
  onNotifications: () => void;
  onBack?: () => void;
}) {
  const initials = profile.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.85rem,env(safe-area-inset-top))] pb-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex size-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: alpha(mou3amla.text, 0.06) }}
        >
          <ChevronLeft className="size-4.5" style={{ color: mou3amla.text }} />
        </button>
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full p-[2px]" style={{ background: igGradient }}>
            <div
              className="flex size-full items-center justify-center rounded-full text-[12px] font-bold text-white"
              style={{ background: mou3amla.hero }}
            >
              {initials || "SQ"}
            </div>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold" style={{ color: mou3amla.text }}>
              Hi @{profile.username}!
            </div>
            <div className="truncate text-[11px] font-normal" style={{ color: mou3amla.textMuted }}>
              Send, receive &amp; manage your routes, all here.
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onNotifications}
        className="relative flex size-10 shrink-0 items-center justify-center rounded-full"
        style={{ background: alpha(mou3amla.text, 0.06) }}
      >
        <Bell className="size-4" style={{ color: mou3amla.text }} />
        {unreadNotifications > 0 ? (
          <span className="absolute top-2 right-2.5 size-1.5 rounded-full" style={{ background: mou3amla.destructive }} />
        ) : null}
      </button>
    </div>
  );
}
