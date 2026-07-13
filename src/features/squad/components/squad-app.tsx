"use client";

import { useSquadApp } from "@/features/squad/hooks/use-squad-app";
import { squad } from "@/features/squad/constants";
import { HomeScreen } from "@/features/squad/components/home-screen";
import { AuthScreen } from "@/features/auth/components/auth-screen";
import { OtpScreen } from "@/features/auth/components/otp-screen";
import { ProfileSetupScreen } from "@/features/onboarding/components/profile-setup-screen";
import { GenerateIntentScreen } from "@/features/payments/components/generate-intent-screen";
import { ReceiveQrScreen } from "@/features/payments/components/receive-qr-screen";
import { ScanQrScreen } from "@/features/payments/components/scan-qr-screen";
import { IntentResultScreen } from "@/features/payments/components/intent-result-screen";
import { ActivityScreen } from "@/features/activity/components/activity-screen";
import { InvoicesScreen } from "@/features/invoices/components/invoices-screen";
import { ProfileScreen } from "@/features/profile/components/profile-screen";
import { AccountSwitcherSheet } from "@/features/profile/components/account-switcher-sheet";

// Adapted from the SQUAD.dc.html design: the source mockup wraps every screen
// in a decorative iPhone bezel (notch, fake status bar, home indicator) for
// preview purposes inside the design tool. A real installed PWA already gets
// a status bar from the OS, so that chrome is intentionally dropped here in
// favor of a full-bleed responsive layout with real safe-area insets.
//
// This is the squad "shell": it owns the shared state machine (use-squad-app)
// and routes to screens that now live in their own domain feature folders
// (auth, onboarding, wallets, payments, activity, invoices, profile) — see
// docs/02-architecture.md.
export function SquadApp() {
  const squadApp = useSquadApp();
  const { screen } = squadApp.state;

  return (
    <div
      className="h-[100dvh] w-full font-sans antialiased overflow-hidden"
      style={{ background: squad.bg, color: squad.text }}
    >
      <div
        className="relative mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden"
        style={{ background: squad.surface, boxShadow: "0 0 0 1px rgba(255,255,255,0.04)" }}
      >
        <div key={screen} className="flex flex-1 flex-col overflow-hidden animate-[squad-screen-in_0.28s_ease_both]">
          {screen === "auth" && <AuthScreen squadApp={squadApp} />}
          {screen === "otp" && <OtpScreen squadApp={squadApp} />}
          {screen === "profile-setup" && <ProfileSetupScreen squadApp={squadApp} />}
          {screen === "home" && <HomeScreen squadApp={squadApp} />}
          {screen === "generate-intent" && <GenerateIntentScreen squadApp={squadApp} />}
          {screen === "receive-qr" && <ReceiveQrScreen squadApp={squadApp} />}
          {screen === "scan-qr" && <ScanQrScreen squadApp={squadApp} />}
          {screen === "intent-result" && <IntentResultScreen squadApp={squadApp} />}
          {screen === "activity" && <ActivityScreen squadApp={squadApp} />}
          {screen === "invoices" && <InvoicesScreen squadApp={squadApp} />}
          {screen === "profile" && <ProfileScreen squadApp={squadApp} />}
        </div>
        <AccountSwitcherSheet squadApp={squadApp} />
      </div>
    </div>
  );
}
