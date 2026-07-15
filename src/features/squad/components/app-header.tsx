import { Bell } from "lucide-react";
import { alpha, squad } from "@/features/squad/constants";
import type { UserProfile } from "@/features/squad/types";

// The one header every authenticated screen shares - avatar, greeting, bell.
// Screens no longer own a bespoke back-button header; the bottom nav is the
// way back to Home, so this stays identical everywhere for a consistent,
// tab-app feel instead of a stack of modal-style sub-screens.
export function AppHeader({
  profile,
  unreadNotifications,
  onNotifications,
}: {
  profile: UserProfile;
  unreadNotifications: number;
  onNotifications: () => void;
}) {
  const initials = profile.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.85rem,env(safe-area-inset-top))] pb-3">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: alpha(squad.accent, 0.12) }}
        >
          <div
            className="flex size-[35px] items-center justify-center rounded-full text-[12px] font-bold text-white"
            style={{ background: squad.hero }}
          >
            {initials || "SQ"}
          </div>
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-bold" style={{ color: squad.text }}>
            Hi @{profile.username}!
          </div>
          <div className="truncate text-[11px] font-normal" style={{ color: squad.textMuted }}>
            Send, receive &amp; manage your routes, all here.
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onNotifications}
        className="relative flex size-10 shrink-0 items-center justify-center rounded-full"
        style={{ background: alpha(squad.text, 0.06) }}
      >
        <Bell className="size-4" style={{ color: squad.text }} />
        {unreadNotifications > 0 ? (
          <span className="absolute top-2 right-2.5 size-1.5 rounded-full" style={{ background: squad.destructive }} />
        ) : null}
      </button>
    </div>
  );
}
