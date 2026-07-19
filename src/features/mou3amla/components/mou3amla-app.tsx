"use client";

import dynamic from "next/dynamic";
import { ContactsScreen } from "@/features/mou3amla/components/contacts-screen";
import { HomeScreen } from "@/features/mou3amla/components/home-screen";
import { mou3amla } from "@/features/mou3amla/constants";
import { useMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import type { InitialMou3amlaUser } from "@/features/mou3amla/types";
import { WalletRegistrySheet } from "@/features/wallets/components/wallet-registry-sheet";

function ScreenLoading() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
      <div className="mb-4 h-10 w-32 rounded-full bg-white/6" />
      <div className="mb-3 h-28 rounded-[28px] bg-white/6" />
      <div className="mb-3 h-24 rounded-[24px] bg-white/6" />
      <div className="h-24 rounded-[24px] bg-white/6" />
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
const AccountsScreen = dynamic(() => import("@/features/wallets/components/accounts-screen").then((mod) => mod.AccountsScreen), {
  loading: () => <ScreenLoading />,
});

export function Mou3amlaApp({ initialUser }: { initialUser: InitialMou3amlaUser }) {
  const mou3amlaApp = useMou3amlaApp(initialUser);
  const { screen } = mou3amlaApp.state;

  return (
    <div
      className="mou3amla-viewport-h w-full overflow-hidden font-sans antialiased"
      style={{ background: mou3amla.bg, color: mou3amla.text }}
    >
      <div className="mou3amla-viewport-h mx-auto flex w-full max-w-sm overflow-hidden px-0 sm:min-h-0 sm:py-3">
        <div
          className="mou3amla-shell-h relative flex flex-1 flex-col overflow-hidden sm:min-h-0 sm:rounded-[36px]"
          style={{
            background: mou3amla.surface,
            boxShadow: "0 16px 42px rgba(0,0,0,0.5), 0 8px 18px rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="pointer-events-none absolute -top-14 right-[-20px] h-44 w-44 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(0,149,246,0.14), transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-[-34px] h-44 w-44 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(122,62,240,0.14), transparent 68%)" }}
          />

          <div
            key={screen}
            className="relative z-10 flex flex-1 flex-col overflow-hidden animate-[mou3amla-screen-in_0.28s_ease_both]"
            style={{ contain: "layout paint style" }}
          >
            {screen === "home" && <HomeScreen mou3amlaApp={mou3amlaApp} />}
            {screen === "contacts" && <ContactsScreen mou3amlaApp={mou3amlaApp} />}
            {screen === "generate-intent" && <GenerateIntentScreen mou3amlaApp={mou3amlaApp} />}
            {screen === "receive-qr" && <ReceiveQrScreen mou3amlaApp={mou3amlaApp} />}
            {screen === "scan-qr" && <ScanQrScreen mou3amlaApp={mou3amlaApp} />}
            {screen === "intent-result" && <IntentResultScreen mou3amlaApp={mou3amlaApp} />}
            {screen === "activity" && <ActivityScreen mou3amlaApp={mou3amlaApp} />}
            {screen === "invoices" && <InvoicesScreen mou3amlaApp={mou3amlaApp} />}
            {screen === "profile" && <ProfileScreen mou3amlaApp={mou3amlaApp} />}
            {screen === "notifications" && <NotificationsScreen mou3amlaApp={mou3amlaApp} />}
            {screen === "accounts" && <AccountsScreen mou3amlaApp={mou3amlaApp} />}
          </div>
        </div>
      </div>
      <WalletRegistrySheet mou3amlaApp={mou3amlaApp} />
    </div>
  );
}
