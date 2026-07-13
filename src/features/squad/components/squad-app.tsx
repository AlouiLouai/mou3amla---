"use client";

import dynamic from "next/dynamic";
import { HomeScreen } from "@/features/squad/components/home-screen";
import { squad } from "@/features/squad/constants";
import { useSquadApp } from "@/features/squad/hooks/use-squad-app";
import type { InitialSquadUser } from "@/features/squad/types";

function ScreenLoading() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
      <div className="mb-4 h-10 w-32 rounded-full bg-black/5" />
      <div className="mb-3 h-28 rounded-[28px] bg-black/5" />
      <div className="mb-3 h-24 rounded-[24px] bg-black/5" />
      <div className="h-24 rounded-[24px] bg-black/5" />
    </div>
  );
}

const ActivityScreen = dynamic(() => import("@/features/activity/components/activity-screen").then((mod) => mod.ActivityScreen), {
  loading: () => <ScreenLoading />,
});
const InvoicesScreen = dynamic(() => import("@/features/invoices/components/invoices-screen").then((mod) => mod.InvoicesScreen), {
  loading: () => <ScreenLoading />,
});
const NotificationsScreen = dynamic(
  () => import("@/features/notifications/components/notifications-screen").then((mod) => mod.NotificationsScreen),
  {
    loading: () => <ScreenLoading />,
  },
);
const GenerateIntentScreen = dynamic(
  () => import("@/features/payments/components/generate-intent-screen").then((mod) => mod.GenerateIntentScreen),
  {
    loading: () => <ScreenLoading />,
  },
);
const IntentResultScreen = dynamic(
  () => import("@/features/payments/components/intent-result-screen").then((mod) => mod.IntentResultScreen),
  {
    loading: () => <ScreenLoading />,
  },
);
const ProfileScreen = dynamic(() => import("@/features/profile/components/profile-screen").then((mod) => mod.ProfileScreen), {
  loading: () => <ScreenLoading />,
});
const ReceiveQrScreen = dynamic(() => import("@/features/payments/components/receive-qr-screen").then((mod) => mod.ReceiveQrScreen), {
  loading: () => <ScreenLoading />,
});
const ScanQrScreen = dynamic(() => import("@/features/payments/components/scan-qr-screen").then((mod) => mod.ScanQrScreen), {
  loading: () => <ScreenLoading />,
});

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
            boxShadow: "0 16px 42px rgba(255,0,131,0.08), 0 8px 18px rgba(0,0,0,0.06)",
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

          <div
            key={screen}
            className="relative z-10 flex flex-1 flex-col overflow-hidden animate-[squad-screen-in_0.28s_ease_both]"
            style={{ contain: "layout paint style" }}
          >
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
