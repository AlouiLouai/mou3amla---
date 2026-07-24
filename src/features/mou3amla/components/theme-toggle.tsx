"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { alpha, mou3amla } from "@/features/mou3amla/constants";

function subscribe() {
  return () => {};
}
function getSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

/**
 * A switch, not a two-icon segmented control, to match the settings-list
 * "Dark Mode" row pattern. `next-themes`' `resolvedTheme` is undefined until
 * mount, so this renders a disabled placeholder for that one frame
 * (useSyncExternalStore, not an effect, to know when that's happened -
 * see docs/06-conventions.md#client-only-reads).
 */
export function ThemeToggle({ onLabel, offLabel }: { onLabel: string; offLabel: string }) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? onLabel : offLabel}
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60"
      style={{ background: isDark ? mou3amla.accent : alpha(mou3amla.text, 0.16) }}
    >
      <span
        className="absolute size-5 rounded-full bg-white shadow-sm transition-[left] duration-200"
        style={{ left: isDark ? "26px" : "4px" }}
      />
    </button>
  );
}
