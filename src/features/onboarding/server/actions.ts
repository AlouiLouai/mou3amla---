"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { VerificationStatus } from "@/features/auth/types";
import { requireCurrentAppUserFresh } from "@/features/auth/server/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_STATUSES = new Set<VerificationStatus>(["unverified", "pending", "verified", "rejected"]);

export async function setMockVerificationStatus(nextStatus: VerificationStatus) {
  if (!ALLOWED_STATUSES.has(nextStatus)) {
    throw new Error("Invalid verification status.");
  }

  const user = await requireCurrentAppUserFresh();
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ verification_status: nextStatus }).eq("id", user.id);

  if (error) {
    throw new Error("Unable to update verification status.");
  }

  revalidatePath("/home");
  revalidatePath("/verify-identity");
  redirect(`/verify-identity?result=${nextStatus}`);
}
