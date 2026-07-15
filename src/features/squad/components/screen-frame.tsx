"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ScreenFrameProps = {
  children: ReactNode;
  contentClassName?: string;
  /** Plain node for a static footer, or a render function that receives whether the footer should render in its compact (scrolled-down) state - e.g. to pass through to `<BottomNav compact={...} />`. */
  footer?: ReactNode | ((compact: boolean) => ReactNode);
  footerClassName?: string;
  header?: ReactNode;
  headerClassName?: string;
};

const SCROLL_HIDE_THRESHOLD_PX = 10;
const SCROLL_TOP_ANCHOR_PX = 4;
// How long a real touch/wheel gesture keeps "counting" after the last input
// event - covers momentum/inertial scrolling that continues to fire `scroll`
// events after the finger lifts, without treating unrelated `scroll` events
// (e.g. the virtual keyboard closing and the browser re-settling scroll
// position after a form field loses focus) as a user-driven scroll.
const GESTURE_DECAY_MS = 600;

export function ScreenFrame({
  children,
  contentClassName,
  footer,
  footerClassName,
  header,
  headerClassName,
}: ScreenFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const [footerCompact, setFooterCompact] = useState(false);
  const footerCompactRef = useRef(footerCompact);

  useEffect(() => {
    footerCompactRef.current = footerCompact;
  }, [footerCompact]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || !footer) return;

    let gestureActive = false;
    let gestureTimeoutId: ReturnType<typeof setTimeout> | null = null;

    function markGestureActive() {
      gestureActive = true;
      if (gestureTimeoutId !== null) clearTimeout(gestureTimeoutId);
      gestureTimeoutId = setTimeout(() => {
        gestureActive = false;
      }, GESTURE_DECAY_MS);
    }

    function handleScroll() {
      if (rafIdRef.current !== null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const top = scrollEl!.scrollTop;
        const delta = top - lastScrollTopRef.current;
        lastScrollTopRef.current = top;

        if (top <= SCROLL_TOP_ANCHOR_PX) {
          setFooterCompact(false);
          return;
        }

        // Only a real touch/wheel gesture may compact the nav - a `scroll`
        // event with no recent gesture behind it (e.g. layout settling after
        // the on-screen keyboard closes) must never be mistaken for the user
        // scrolling down.
        if (!gestureActive) return;

        if (delta > SCROLL_HIDE_THRESHOLD_PX) {
          setFooterCompact(true);
        } else if (delta < -SCROLL_HIDE_THRESHOLD_PX) {
          setFooterCompact(false);
        }
      });
    }

    // Deliberately NOT `touchstart`: a plain tap fires touchstart with no
    // finger movement at all, so a tap on any button (e.g. a search result)
    // would arm the gesture window and let an unrelated `scroll` event -
    // fired moments later by the layout reflow that tap caused - be
    // misread as the user scrolling down. Only touchmove/wheel prove actual
    // scrolling motion happened.
    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    scrollEl.addEventListener("touchmove", markGestureActive, { passive: true });
    scrollEl.addEventListener("wheel", markGestureActive, { passive: true });
    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
      scrollEl.removeEventListener("touchmove", markGestureActive);
      scrollEl.removeEventListener("wheel", markGestureActive);
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (gestureTimeoutId !== null) clearTimeout(gestureTimeoutId);
    };
  }, [footer]);

  useEffect(() => {
    const footerEl = footerRef.current;
    const rootEl = rootRef.current;
    if (!footerEl || !rootEl || !footer) return;

    const observer = new ResizeObserver((entries) => {
      // Pin the scroll-spacer to the footer's expanded height only - measuring
      // while compact would shrink the spacer and jolt content as the nav
      // resizes on every scroll direction change.
      if (footerCompactRef.current) return;
      const height = entries[0]?.contentRect.height;
      if (height) rootEl.style.setProperty("--squad-bottomnav-h", `${height}px`);
    });

    observer.observe(footerEl);
    return () => observer.disconnect();
  }, [footer]);

  return (
    <div ref={rootRef} className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {header ? <div className={cn("shrink-0", headerClassName)}>{header}</div> : null}
      <div ref={scrollRef} className={cn("squad-scroll min-h-0 flex-1 overflow-y-auto", contentClassName)}>
        {children}
        {footer ? <div aria-hidden style={{ height: "var(--squad-bottomnav-h, 84px)" }} /> : null}
      </div>
      {footer ? (
        <div ref={footerRef} className={cn("absolute inset-x-0 bottom-0 z-20", footerClassName)}>
          {typeof footer === "function" ? footer(footerCompact) : footer}
        </div>
      ) : null}
    </div>
  );
}
