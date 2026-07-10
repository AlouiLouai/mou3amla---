"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHasMounted } from "@/hooks/use-has-mounted";

const DISMISSED_KEY = "pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari-specific flag, not part of the standard Navigator type.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const hasMounted = useHasMounted();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [promptable, setPromptable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setPromptable(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (!hasMounted) return null;

  const isIOS = isIOSDevice();
  const alreadyDismissed = dismissed || localStorage.getItem(DISMISSED_KEY) === "1";

  if (isStandalone() || alreadyDismissed || (!isIOS && !promptable)) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
    setPromptable(false);
  }

  return (
    <Card className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm shadow-lg sm:right-4 sm:left-auto">
      <CardHeader>
        <CardTitle className="text-base">Install this app</CardTitle>
        <CardDescription>
          {isIOS
            ? 'Tap the Share icon, then "Add to Home Screen".'
            : "Add it to your home screen for a faster, app-like experience."}
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon" aria-label="Dismiss" onClick={dismiss}>
            <X className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      {!isIOS && (
        <CardContent>
          <Button onClick={install} className="w-full">
            <Download className="size-4" />
            Install
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
