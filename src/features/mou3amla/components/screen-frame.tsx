"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type ScreenFrameProps = {
  children: ReactNode;
  contentClassName?: string;
  footer?: ReactNode;
  footerClassName?: string;
  header?: ReactNode;
  headerClassName?: string;
};

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

  return (
    <div ref={rootRef} className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {header ? <div className={cn("shrink-0", headerClassName)}>{header}</div> : null}
      <div className={cn("mou3amla-scroll min-h-0 flex-1 overflow-y-auto", contentClassName)}>
        {children}
        {footer ? <div aria-hidden style={{ height: "var(--mou3amla-bottomnav-h, 84px)" }} /> : null}
      </div>
      {footer ? (
        <div ref={footerRef} className={cn("absolute inset-x-0 bottom-0 z-20", footerClassName)}>
          {footer}
        </div>
      ) : null}
    </div>
  );
}
