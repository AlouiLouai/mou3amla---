import { redirect } from "next/navigation";
import { OtpScreen } from "@/features/auth/components/otp-screen";
import { readDemoOtpCookie } from "@/features/auth/server/demo-otp";
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

  const demoOtp = await readDemoOtpCookie(phone, username);

  return <OtpScreen phone={phone} username={username} demoOtp={demoOtp} />;
}
