import { requireCurrentAppUser } from "@/features/auth/server/dal";
import { Mou3amlaApp } from "@/features/mou3amla/components/mou3amla-app";

type HomePageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function HomePage(props: HomePageProps) {
  const user = await requireCurrentAppUser();
  const searchParams = await props.searchParams;
  const highlightedRefId = typeof searchParams.payment_ref === "string" ? searchParams.payment_ref : "";
  const forcedScreen = typeof searchParams.screen === "string" ? searchParams.screen : "";
  const highlightedActivity = highlightedRefId ? user.activityLog.find((item) => item.refId === highlightedRefId) ?? null : null;
  const initialScreen = forcedScreen === "activity" || highlightedActivity ? "activity" : "home";

  return (
    <Mou3amlaApp
      initialUser={{
        id: user.id,
        phone: user.phone,
        username: user.username,
        displayName: user.displayName,
        verificationStatus: user.verificationStatus,
        kycProviderStatus: user.kycProviderStatus,
        cardGradient: user.cardGradient,
        accountType: user.accountType,
        wallets: user.wallets,
        sourceWalletId: user.sourceWalletId,
        activityLog: user.activityLog,
        notifications: user.notifications,
        invoices: user.invoices,
        passkeyCount: user.passkeyCount,
        initialScreen,
        highlightedActivityId: highlightedActivity?.id ?? null,
      }}
    />
  );
}
