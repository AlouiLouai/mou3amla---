"use client";

import { useEffect, useState } from "react";
import { useSerwist } from "@serwist/turbopack/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Center modal for "a new version of the app is installed and waiting" -
 * see the comment on `skipWaiting` in src/app/sw.ts for why the worker
 * doesn't just activate itself silently. `serwist.addEventListener("waiting", ...)`
 * fires whenever a new worker finishes installing and is held back from
 * activating; `event.isUpdate` is false/undefined the very first time a
 * worker is ever installed for this origin (nothing to update from yet),
 * so only a genuine update opens this. Confirming sends
 * `{ type: "SKIP_WAITING" }` to the waiting worker (Serwist's core package
 * always listens for that message unless it was told to skip waiting
 * unconditionally, which it isn't here) and reloads once it takes control. */
export function UpdatePrompt() {
  const { serwist } = useSerwist();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!serwist) return;

    const onWaiting = (event: { isUpdate?: boolean }) => {
      if (event.isUpdate) setUpdateAvailable(true);
    };

    serwist.addEventListener("waiting", onWaiting);
    return () => serwist.removeEventListener("waiting", onWaiting);
  }, [serwist]);

  useEffect(() => {
    if (!serwist || !updating) return;

    const onControlling = () => window.location.reload();
    serwist.addEventListener("controlling", onControlling);
    return () => serwist.removeEventListener("controlling", onControlling);
  }, [serwist, updating]);

  return (
    <Dialog open={updateAvailable} onOpenChange={(open) => !updating && setUpdateAvailable(open)}>
      <DialogContent showCloseButton={!updating}>
        <DialogHeader>
          <DialogTitle>Update available</DialogTitle>
          <DialogDescription>A new version of Mou3amla is ready. Update now for the latest fixes.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={updating} onClick={() => setUpdateAvailable(false)}>
            Later
          </Button>
          <Button
            disabled={updating}
            onClick={() => {
              setUpdating(true);
              serwist?.messageSkipWaiting();
            }}
          >
            {updating ? "Updating..." : "Update now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
