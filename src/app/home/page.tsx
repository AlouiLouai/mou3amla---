import { requireCurrentAppUser } from "@/features/auth/server/dal";
import { Mou3amlaApp } from "@/features/mou3amla/components/mou3amla-app";

export default async function HomePage() {
  const user = await requireCurrentAppUser();

  return (
    <Mou3amlaApp
      initialUser={{
        phone: user.phone,
        username: user.username,
        displayName: user.displayName,
        verificationStatus: user.verificationStatus,
        kycProviderStatus: user.kycProviderStatus,
        wallets: user.wallets,
        sourceWalletId: user.sourceWalletId,
        activityLog: user.activityLog,
        notifications: user.notifications,
        invoices: user.invoices,
      }}
    />
  );
}
