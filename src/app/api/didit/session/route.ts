import { NextResponse } from "next/server";
import { DIDIT_CALLBACK_PATH, DIDIT_KYC_WORKFLOW_ID } from "@/config/kyc";
import { serverEnv } from "@/config/env.server";
import { getCurrentAppUser } from "@/features/auth/server/dal";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { createAdminClient } from "@/lib/supabase/admin";

const DIDIT_TIMEOUT_MS = 15_000;

export async function POST(request: Request) {
  const user = await getCurrentAppUser();

  if (!user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (user.verificationStatus === "verified") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (!serverEnv.DIDIT_API_KEY) {
    return NextResponse.redirect(new URL("/verify-identity/return?status=Didit%20not%20configured", request.url));
  }

  const callbackUrl = new URL(DIDIT_CALLBACK_PATH, serverEnv.NEXT_PUBLIC_APP_URL ?? request.url);

  let diditResponse: Response;
  try {
    diditResponse = await fetchWithTimeout(
      "https://verification.didit.me/v3/session/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": serverEnv.DIDIT_API_KEY,
        },
        body: JSON.stringify({
          workflow_id: DIDIT_KYC_WORKFLOW_ID,
          callback: callbackUrl.toString(),
          vendor_data: user.id,
          language: "fr",
          metadata: {
            username: user.username,
            phone: user.phone,
          },
          expected_details: {
            expected_document_types: ["ID"],
          },
        }),
      },
      DIDIT_TIMEOUT_MS,
    );
  } catch {
    return NextResponse.redirect(new URL("/verify-identity/return?status=Launch%20failed", request.url));
  }

  if (!diditResponse.ok) {
    return NextResponse.redirect(new URL("/verify-identity/return?status=Launch%20failed", request.url));
  }

  const session = (await diditResponse.json()) as {
    session_id: string;
    status: string;
    url: string;
  };

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      verification_status: "pending",
      didit_latest_status: session.status,
      didit_session_id: session.session_id,
    })
    .eq("id", user.id);

  return NextResponse.redirect(session.url);
}
