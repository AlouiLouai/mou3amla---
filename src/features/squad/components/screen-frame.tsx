import type { ReactNode } from "react";
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
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {header ? <div className={cn("shrink-0", headerClassName)}>{header}</div> : null}
      <div className={cn("squad-scroll min-h-0 flex-1 overflow-y-auto", contentClassName)}>{children}</div>
      {footer ? <div className={cn("shrink-0", footerClassName)}>{footer}</div> : null}
    </div>
  );
}
