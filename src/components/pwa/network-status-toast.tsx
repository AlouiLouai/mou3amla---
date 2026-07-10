"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function NetworkStatusToast() {
  const isOnline = useOnlineStatus();
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (isOnline) {
      toast.success("Back online");
    } else {
      toast.warning("You're offline", {
        description: "Some actions may be unavailable until you reconnect.",
      });
    }
  }, [isOnline]);

  return null;
}
