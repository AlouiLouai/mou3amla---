"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { runDemoVerification } from "@/features/onboarding/server/actions";

const DEMO_STEPS = ["Preparing secure session", "Scanning ID document", "Running liveness check", "Matching your face"] as const;
const STEP_DELAY_MS = 900;

export function useDemoVerification() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(-1);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(
    () => () => {
      cancelledRef.current = true;
    },
    [],
  );

  const start = useCallback(() => {
    cancelledRef.current = false;
    setRunning(true);
    setDone(false);
    setError(null);
    setStepIndex(0);

    const advance = async (index: number) => {
      if (cancelledRef.current) return;

      if (index >= DEMO_STEPS.length) {
        const result = await runDemoVerification();
        if (cancelledRef.current) return;

        if (!result.ok) {
          setRunning(false);
          setError(result.message);
          return;
        }

        setRunning(false);
        setDone(true);
        router.refresh();
        return;
      }

      setStepIndex(index);
      window.setTimeout(() => void advance(index + 1), STEP_DELAY_MS);
    };

    void advance(0);
  }, [router]);

  return { steps: DEMO_STEPS, stepIndex, running, done, error, start };
}
