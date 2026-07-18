"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentAppUser } from "@/features/auth/server/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const DEMO_PROVIDER_STATUS = "Demo Approved (simulated - no real identity document was checked)";

type RunDemoVerificationResult = { ok: true } | { ok: false; message: string };

/** Simulated KYC approval - this is the only verification path right now;
 * no real eKYC provider is wired up until one accepted by INPDP is chosen.
 * Writes the same `verification_events` audit trail a real provider sync
 * would, with `source: "demo_kyc"` and a provider_status that can never be
 * mistaken for a genuine decision. */
async function runDemoVerificationUnsafe(): Promise<RunDemoVerificationResult> {
  const user = await getCurrentAppUser();
  if (!user) {
    return { ok: false, message: "You need to be signed in to run the demo verification." };
  }

  if (user.verificationStatus === "verified") {
    return { ok: true };
  }

  const withinLimit = await checkRateLimit(`demo-verification:${user.id}`, { max: 5, windowSeconds: 300 });
  if (!withinLimit) {
    return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
  }

  const admin = createAdminClient();
  const sessionId = `demo-${randomUUID()}`;

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      verification_status: "verified",
      kyc_provider_status: "Demo Approved",
    })
    .eq("id", user.id);

  if (updateError) {
    logger.error("Failed to write demo verification status", updateError, { userId: user.id });
    return { ok: false, message: "The demo verification couldn't be recorded. Please retry." };
  }

  // The status update above already committed - a failure here would be an
  // audit-trail gap, not a failed verification, so it's logged rather than
  // reported back as an error (the user's status did in fact change).
  const { error: eventError } = await admin.from("verification_events").insert({
    user_id: user.id,
    previous_status: user.verificationStatus,
    next_status: "verified",
    source: "demo_kyc",
    provider_session_id: sessionId,
    provider_status: DEMO_PROVIDER_STATUS,
  });

  if (eventError) {
    logger.error("Failed to write demo verification audit event", eventError, { userId: user.id });
  }

  revalidatePath("/verify-identity");
  revalidatePath("/home");

  return { ok: true };
}

export async function runDemoVerification(): Promise<RunDemoVerificationResult> {
  try {
    return await runDemoVerificationUnsafe();
  } catch (error) {
    logger.error("Unhandled error in runDemoVerification", error);
    return { ok: false, message: "We couldn't run the demo verification right now. Please retry." };
  }
}
