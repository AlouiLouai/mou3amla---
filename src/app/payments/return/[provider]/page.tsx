import { redirect } from "next/navigation";
import { requireCurrentAppUser } from "@/features/auth/server/dal";
import { isHostedCheckoutProvider } from "@/features/payments/lib/provider-checkout";
import { resolveRefIdFromProviderCallback, verifyAndFinalizeProviderReturn } from "@/features/payments/server/provider-returns";

type PaymentReturnPageProps = {
  params: Promise<{ provider: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PaymentReturnPage(props: PaymentReturnPageProps) {
  const [{ provider }, searchParams] = await Promise.all([props.params, props.searchParams]);
  await requireCurrentAppUser();

  if (!isHostedCheckoutProvider(provider)) {
    redirect("/home");
  }

  // Flouci redirects the browser back with its own `payment_id` appended, so
  // accept either our `?ref=` or the provider payment ref as the key.
  const refId = await resolveRefIdFromProviderCallback({
    refId: typeof searchParams.ref === "string" ? searchParams.ref : null,
    providerPaymentRef: typeof searchParams.payment_id === "string" ? searchParams.payment_id : null,
  });
  if (!refId) {
    redirect("/home");
  }

  const result = await verifyAndFinalizeProviderReturn(provider, refId);
  redirect(result.redirectTo);
}
