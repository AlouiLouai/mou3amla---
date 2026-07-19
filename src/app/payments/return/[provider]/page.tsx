import { redirect } from "next/navigation";
import { requireCurrentAppUser } from "@/features/auth/server/dal";
import { isSupportedCheckoutProvider } from "@/features/payments/lib/provider-checkout";
import { verifyAndFinalizeProviderReturn } from "@/features/payments/server/provider-returns";

type PaymentReturnPageProps = {
  params: Promise<{ provider: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PaymentReturnPage(props: PaymentReturnPageProps) {
  const [{ provider }, searchParams] = await Promise.all([props.params, props.searchParams]);
  await requireCurrentAppUser();

  const refId = typeof searchParams.ref === "string" ? searchParams.ref : "";
  if (!refId || !isSupportedCheckoutProvider(provider)) {
    redirect("/home");
  }

  const result = await verifyAndFinalizeProviderReturn(provider, refId);
  redirect(result.redirectTo);
}
