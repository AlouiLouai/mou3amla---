"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { alpha, mou3amla, raisedShadow } from "@/features/mou3amla/constants";
import { cn } from "@/lib/utils";

const DISMISS_DISTANCE_PX = 120;
const DISMISS_VELOCITY_PX_MS = 0.55;

type DragState = { startY: number; startTime: number; lastY: number; lastTime: number };

// Shared shell for every bottom sheet in the app (LanguageSheet, InfoSheet,
// WalletRegistrySheet) - was three copies of the same backdrop/card/grabber
// markup with no actual drag behavior wired to the (purely decorative)
// grabber pill. Drag is scoped to this header/grabber strip, not the whole
// sheet body, so it never fights a scrollable content area a caller nests
// inside `children` (see WalletRegistrySheet's provider list).
export function BottomSheet({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);

  if (!open) return null;

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const now = performance.now();
    dragRef.current = { startY: event.clientY, startTime: now, lastY: event.clientY, lastTime: now };
    setDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const delta = event.clientY - dragRef.current.startY;
    // Only downward drag is a real dismiss gesture here - resist upward drag
    // instead of letting the sheet fly off past its resting position.
    setDragY(delta < 0 ? delta / 3 : delta);
    dragRef.current.lastY = event.clientY;
    dragRef.current.lastTime = performance.now();
  };

  const handlePointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);

    if (!drag) {
      setDragY(0);
      return;
    }

    const elapsedMs = Math.max(1, drag.lastTime - drag.startTime);
    const velocity = (drag.lastY - drag.startY) / elapsedMs;
    const shouldDismiss = dragY > DISMISS_DISTANCE_PX || velocity > DISMISS_VELOCITY_PX_MS;

    setDragY(0);
    if (shouldDismiss) onClose();
  };

  return (
    <>
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 z-40 backdrop-blur-sm" style={{ background: "rgba(5,6,8,0.65)" }} />
      <div
        className={cn("fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-[28px] border border-b-0 px-5 pt-2 pb-[max(1.75rem,env(safe-area-inset-bottom))]", className)}
        style={{
          background: mou3amla.card,
          borderColor: mou3amla.borderStrong,
          boxShadow: raisedShadow,
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
          animation: dragging ? undefined : "mou3amla-fadeup 0.25s ease both",
        }}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="flex touch-none flex-col items-center py-2.5"
          style={{ cursor: dragging ? "grabbing" : "grab" }}
        >
          <div className="h-1 w-9 rounded-full" style={{ background: alpha(mou3amla.accent, 0.18) }} />
        </div>
        {children}
      </div>
    </>
  );
}
