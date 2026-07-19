import { igGradient, mou3amla } from "@/features/mou3amla/constants";

// The "m" badge + "mou3amla" wordmark pairing shown on the auth screen and
// reused verbatim as the launch splash content, so the very first and very
// last pre-authenticated things a user sees are pixel-identical. The
// staggered entrance (mark pops in, wordmark and tagline settle in after) is
// pure CSS - see mou3amla-mark-in / mou3amla-fadeup in globals.css - so it
// plays correctly on the splash screen's server-rendered first paint with no
// JS/hydration timing dependency, and the global
// `prefers-reduced-motion: reduce` override already strips it for anyone
// who's asked for that.
export function LogoLockup({ tagline, animate = true }: { tagline?: string; animate?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex size-16 items-center justify-center rounded-[22px] p-[2.5px]"
        style={{
          background: igGradient,
          ...(animate ? { animation: "mou3amla-mark-in 0.7s cubic-bezier(0.22,1,0.36,1) both" } : {}),
        }}
      >
        <div className="flex size-full items-center justify-center rounded-[19.5px]" style={{ background: mou3amla.bg }}>
          <span className="text-[28px] leading-none font-black text-white" style={{ fontFamily: "var(--font-syne)" }}>
            m
          </span>
        </div>
      </div>
      <div
        className="mt-4 text-[1.5rem] leading-none font-black tracking-tight text-white"
        style={{
          fontFamily: "var(--font-syne)",
          ...(animate ? { animation: "mou3amla-fadeup 0.5s ease-out 0.28s both" } : {}),
        }}
      >
        mou3amla
      </div>
      {tagline ? (
        <p
          className="mt-2 max-w-[230px] text-center text-[12px] leading-relaxed"
          style={{
            color: mou3amla.textMuted,
            ...(animate ? { animation: "mou3amla-fadeup 0.5s ease-out 0.44s both" } : {}),
          }}
        >
          {tagline}
        </p>
      ) : null}
    </div>
  );
}
