"use client";

import { ActivityScreen } from "@/features/activity/components/activity-screen";
import { InvoicesScreen } from "@/features/invoices/components/invoices-screen";
import { NotificationsScreen } from "@/features/notifications/components/notifications-screen";
import { GenerateIntentScreen } from "@/features/payments/components/generate-intent-screen";
import { IntentResultScreen } from "@/features/payments/components/intent-result-screen";
import { ReceiveQrScreen } from "@/features/payments/components/receive-qr-screen";
import { ScanQrScreen } from "@/features/payments/components/scan-qr-screen";
import { ProfileScreen } from "@/features/profile/components/profile-screen";
import { HomeScreen } from "@/features/squad/components/home-screen";
import { squad } from "@/features/squad/constants";
import { useSquadApp } from "@/features/squad/hooks/use-squad-app";
import type { InitialSquadUser } from "@/features/squad/types";

export function SquadApp({ initialUser }: { initialUser: InitialSquadUser }) {
  const squadApp = useSquadApp(initialUser);
  const { screen } = squadApp.state;

  return (
    <div
      className="min-h-[100dvh] w-full overflow-hidden font-sans antialiased"
      style={{ background: squad.bg, color: squad.text }}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md overflow-hidden px-0 sm:min-h-0 sm:py-3">
        <div
          className="relative flex min-h-[100dvh] flex-1 flex-col overflow-hidden sm:min-h-0 sm:rounded-[36px]"
          style={{
            background: squad.surface,
            boxShadow: "0 24px 80px rgba(255,0,131,0.10), 0 10px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div
            className="pointer-events-none absolute -top-14 right-[-20px] h-44 w-44 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,0,131,0.12), transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-[-34px] h-44 w-44 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,141,40,0.14), transparent 68%)" }}
          />

          <div key={screen} className="relative z-10 flex flex-1 flex-col overflow-hidden animate-[squad-screen-in_0.28s_ease_both]">
            {screen === "home" && <HomeScreen squadApp={squadApp} />}
            {screen === "generate-intent" && <GenerateIntentScreen squadApp={squadApp} />}
            {screen === "receive-qr" && <ReceiveQrScreen squadApp={squadApp} />}
            {screen === "scan-qr" && <ScanQrScreen squadApp={squadApp} />}
            {screen === "intent-result" && <IntentResultScreen squadApp={squadApp} />}
            {screen === "activity" && <ActivityScreen squadApp={squadApp} />}
            {screen === "invoices" && <InvoicesScreen squadApp={squadApp} />}
            {screen === "profile" && <ProfileScreen squadApp={squadApp} />}
            {screen === "notifications" && <NotificationsScreen squadApp={squadApp} />}
          </div>
        </div>
      </div>
    </div>
  );
}
