"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ScreenFrameProps = {
  children: ReactNode;
  contentClassName?: string;
  footer?: ReactNode;
  footerClassName?: string;
  header?: ReactNode;
  headerClassName?: string;
};

const SCROLL_HIDE_THRESHOLD_PX = 10;
const SCROLL_TOP_ANCHOR_PX = 4;

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
  const [footerHidden, setFooterHidden] = useState(false);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || !footer) return;

    function handleScroll() {
      if (rafIdRef.current !== null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const top = scrollEl!.scrollTop;
        const delta = top - lastScrollTopRef.current;

        if (top <= SCROLL_TOP_ANCHOR_PX) {
          setFooterHidden(false);
        } else if (delta > SCROLL_HIDE_THRESHOLD_PX) {
          setFooterHidden(true);
        } else if (delta < -SCROLL_HIDE_THRESHOLD_PX) {
          setFooterHidden(false);
        }

        lastScrollTopRef.current = top;
      });
    }

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [footer]);

  useEffect(() => {
    const footerEl = footerRef.current;
    const rootEl = rootRef.current;
    if (!footerEl || !rootEl || !footer) return;

    const observer = new ResizeObserver((entries) => {
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
        <div
          ref={footerRef}
          className={cn("absolute inset-x-0 bottom-0 z-20 transition-transform duration-300 ease-out", footerClassName)}
          style={{ transform: footerHidden ? "translateY(115%)" : "translateY(0)" }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
