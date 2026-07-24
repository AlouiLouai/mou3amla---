"use client";

import { useState } from "react";
import { PasskeyScreen } from "@/features/auth/components/passkey-screen";
import { ProfileBuilderScreen } from "@/features/auth/components/profile-builder-screen";

// Single-entry auth stays single-entry (docs/06-conventions.md: no separate
// sign-in/sign-up screens) - this just adds one client-side beat inside the
// existing /verify route for new users, never a new route or screen type.
// Returning users (`mode === "authenticate"`) skip straight to the passkey
// step exactly as before.
export function VerifyFlow({ phone, username, mode }: { phone: string; username: string; mode: "register" | "authenticate" }) {
  const [step, setStep] = useState<"profile" | "passkey">(mode === "register" ? "profile" : "passkey");

  if (step === "profile") {
    return <ProfileBuilderScreen phone={phone} username={username} onContinue={() => setStep("passkey")} />;
  }

  return <PasskeyScreen phone={phone} username={username} mode={mode} />;
}
