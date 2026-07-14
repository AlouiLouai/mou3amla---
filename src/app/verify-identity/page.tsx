import { requireCurrentAppUser } from "@/features/auth/server/dal";
import { VerificationFlowScreen } from "@/features/onboarding/components/verification-flow-screen";
import type { VerificationStatus } from "@/features/auth/types";

function parseResultStatus(value: string | string[] | undefined): VerificationStatus | null {
  if (value === "unverified" || value === "pending" || value === "verified" || value === "rejected") {
    return value;
  }

  return null;
}

type VerifyIdentityPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function VerifyIdentityPage(props: VerifyIdentityPageProps) {
  const [user, searchParams] = await Promise.all([requireCurrentAppUser(), props.searchParams]);
  const resultStatus = parseResultStatus(searchParams.result);

  return <VerificationFlowScreen user={user} resultStatus={resultStatus} />;
}
