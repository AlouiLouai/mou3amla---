import { redirect } from "next/navigation";
import { VerifyFlow } from "@/features/auth/components/verify-flow";
import { readPasskeyModeCookie } from "@/features/auth/server/passkey-bridge";
import { getCurrentAppUser } from "@/features/auth/server/dal";

type VerifyPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function VerifyPage(props: VerifyPageProps) {
  const [searchParams, user] = await Promise.all([props.searchParams, getCurrentAppUser()]);

  if (user) {
    redirect("/home");
  }

  const phone = typeof searchParams.phone === "string" ? searchParams.phone : "";
  const username = typeof searchParams.username === "string" ? searchParams.username : "";

  if (!phone || !username) {
    redirect("/");
  }

  const mode = await readPasskeyModeCookie(phone, username);

  if (!mode) {
    redirect("/");
  }

  return <VerifyFlow phone={phone} username={username} mode={mode} />;
}
