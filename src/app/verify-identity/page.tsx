import { requireCurrentAppUser } from "@/features/auth/server/dal";
import { VerificationFlowScreen } from "@/features/onboarding/components/verification-flow-screen";

export default async function VerifyIdentityPage() {
  const user = await requireCurrentAppUser();

  return <VerificationFlowScreen user={user} />;
}
