import { AuthScreen } from "@/features/auth/components/auth-screen";
import { redirectIfAuthenticated } from "@/features/auth/server/dal";

export default async function Page() {
  await redirectIfAuthenticated();

  return <AuthScreen />;
}
