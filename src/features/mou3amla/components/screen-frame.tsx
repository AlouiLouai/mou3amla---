"use client";

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ScreenFrameProps = {
  children: ReactNode;
  contentClassName?: string;
  footer?: ReactNode;
  footerClassName?: string;
  header?: ReactNode;
  headerClassName?: string;
};

// Lets the bottom nav react to the scroll direction of *this* screen's body
// without prop-drilling through every `renderAppFooter(...)` call site - the
// footer node is built by each screen, then handed to ScreenFrame as a plain
// prop, so ScreenFrame is the only place that actually sees the scroll
// events and needs a side channel back down to whatever it rendered.
const ScrollCompactContext = createContext(false);
export function useScrollCompact() {
  return useContext(ScrollCompactContext);
}

// Ignore sub-pixel/inertia jitter so the nav doesn't flicker between states
// on tiny scroll deltas; require a decent swipe before flipping.
const SCROLL_DIRECTION_THRESHOLD_PX = 10;

export function ScreenFrame({
  children,
  contentClassName,
  footer,
  footerClassName,
  header,
  headerClassName,
}: ScreenFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const footerEl = footerRef.current;
    const rootEl = rootRef.current;
    if (!footerEl || !rootEl || !footer) return;

    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height) rootEl.style.setProperty("--mou3amla-bottomnav-h", `${height}px`);
    });

    observer.observe(footerEl);
    return () => observer.disconnect();
  }, [footer]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const top = event.currentTarget.scrollTop;
    const delta = top - lastScrollTopRef.current;

    if (top <= 8) {
      setCompact(false);
      lastScrollTopRef.current = top;
      return;
    }

    if (Math.abs(delta) < SCROLL_DIRECTION_THRESHOLD_PX) return;
    setCompact(delta > 0);
    lastScrollTopRef.current = top;
  };

  return (
    <div ref={rootRef} className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {header ? <div className={cn("shrink-0", headerClassName)}>{header}</div> : null}
      <div className={cn("mou3amla-scroll min-h-0 flex-1 overflow-y-auto", contentClassName)} onScroll={handleScroll}>
        {children}
        {footer ? <div aria-hidden style={{ height: "var(--mou3amla-bottomnav-h, 84px)" }} /> : null}
      </div>
      {footer ? (
        <div ref={footerRef} className={cn("absolute inset-x-0 bottom-0 z-20", footerClassName)}>
          <ScrollCompactContext.Provider value={compact}>{footer}</ScrollCompactContext.Provider>
        </div>
      ) : null}
    </div>
  );
}
