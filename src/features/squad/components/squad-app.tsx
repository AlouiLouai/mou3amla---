"use client";

import { useSquadApp } from "@/features/squad/hooks/use-squad-app";
import { squad } from "@/features/squad/constants";
import { AuthScreen } from "@/features/squad/components/screens/auth-screen";
import { OtpScreen } from "@/features/squad/components/screens/otp-screen";
import { HomeScreen } from "@/features/squad/components/screens/home-screen";
import { KycScreen } from "@/features/squad/components/screens/kyc-screen";
import { TransferScreen } from "@/features/squad/components/screens/transfer-screen";
import { ActivityScreen } from "@/features/squad/components/screens/activity-screen";
import { ProfileScreen } from "@/features/squad/components/screens/profile-screen";

// Adapted from the SQUAD.dc.html design: the source mockup wraps every screen
// in a decorative iPhone bezel (notch, fake status bar, home indicator) for
// preview purposes inside the design tool. A real installed PWA already gets
// a status bar from the OS, so that chrome is intentionally dropped here in
// favor of a full-bleed responsive layout with real safe-area insets.
export function SquadApp() {
  const squadApp = useSquadApp();
  const { screen } = squadApp.state;

  return (
    <div
      className="h-[100dvh] w-full font-sans antialiased overflow-hidden"
      style={{ background: squad.bg, color: squad.text }}
    >
      <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden" style={{ background: squad.surface }}>
        {screen === "auth" && <AuthScreen squadApp={squadApp} />}
        {screen === "otp" && <OtpScreen squadApp={squadApp} />}
        {screen === "home" && <HomeScreen squadApp={squadApp} />}
        {screen === "kyc" && <KycScreen squadApp={squadApp} />}
        {screen === "transfer" && <TransferScreen squadApp={squadApp} />}
        {screen === "activity" && <ActivityScreen squadApp={squadApp} />}
        {screen === "profile" && <ProfileScreen squadApp={squadApp} />}
      </div>
    </div>
  );
}
