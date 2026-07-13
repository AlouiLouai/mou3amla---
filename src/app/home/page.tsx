import { requireCurrentAppUser } from "@/features/auth/server/dal";
import { SquadApp } from "@/features/squad/components/squad-app";

export default async function HomePage() {
  const user = await requireCurrentAppUser();

  return (
    <SquadApp
      initialUser={{
        phone: user.phone,
        username: user.username,
        displayName: user.displayName,
        verificationStatus: user.verificationStatus,
        diditLatestStatus: user.diditLatestStatus,
        diditSessionId: user.diditSessionId,
        wallets: user.wallets,
        sourceWalletId: user.sourceWalletId,
        activityLog: user.activityLog,
        notifications: user.notifications,
        invoices: user.invoices,
      }}
    />
  );
}
