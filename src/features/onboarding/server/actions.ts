"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { serverEnv } from "@/config/env.server";
import { getCurrentAppUser } from "@/features/auth/server/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const DEMO_PROVIDER_STATUS = "Demo Approved (simulated - no real identity document was checked)";

/** Simulated KYC approval for demo/pitch environments where no eKYC provider
 * is wired up yet (or the wired one is temporarily unusable). Gated on
 * `KYC_DEMO_MODE` server-side so it can't be invoked just because the UI
 * happens to render the demo panel. Writes the same `verification_events`
 * audit trail as a real Didit sync, with `source: "demo_kyc"` and a
 * provider_status that can never be mistaken for a genuine Didit decision. */
export async function runDemoVerification(): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!serverEnv.KYC_DEMO_MODE) {
    return { ok: false, message: "Demo verification mode is not enabled." };
  }

  const user = await getCurrentAppUser();
  if (!user) {
    return { ok: false, message: "You need to be signed in to run the demo verification." };
  }

  if (user.verificationStatus === "verified") {
    return { ok: true };
  }

  const admin = createAdminClient();
  const sessionId = `demo-${randomUUID()}`;

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      verification_status: "verified",
      didit_latest_status: "Demo Approved",
      didit_session_id: sessionId,
    })
    .eq("id", user.id);

  if (updateError) {
    return { ok: false, message: "The demo verification couldn't be recorded. Please retry." };
  }

  await admin.from("verification_events").insert({
    user_id: user.id,
    previous_status: user.verificationStatus,
    next_status: "verified",
    source: "demo_kyc",
    provider_session_id: sessionId,
    provider_status: DEMO_PROVIDER_STATUS,
  });

  revalidatePath("/verify-identity");
  revalidatePath("/home");

  return { ok: true };
}
