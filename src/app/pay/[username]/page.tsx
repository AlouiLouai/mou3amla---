import { redirect } from "next/navigation";
import { requireCurrentAppUser } from "@/features/auth/server/dal";
import { resolvePaymentRequestPrefill } from "@/features/payments/server/payment-request-link";
import { Mou3amlaApp } from "@/features/mou3amla/components/mou3amla-app";

type PaymentRequestPageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PaymentRequestPage(props: PaymentRequestPageProps) {
  const [{ username }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const user = await requireCurrentAppUser();

  const rawAmount = typeof searchParams.amount === "string" ? searchParams.amount : undefined;
  const prefill = await resolvePaymentRequestPrefill({ username, rawAmount, currentUserId: user.id });

  if (!prefill.ok) {
    redirect("/home");
  }

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
        initialScreen: "generate-intent",
        prefillRecipient: prefill.recipient,
        prefillAmount: prefill.amount,
      }}
    />
  );
}
