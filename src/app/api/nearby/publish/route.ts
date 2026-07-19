import { NextResponse } from "next/server";
import { z } from "zod";
import { NEARBY_CODE_TTL_MS } from "@/features/payments/constants";
import { roundCoord } from "@/features/payments/lib/geolocation";
import { generateNearbyCode } from "@/features/payments/lib/nearby-code";
import { withRouteErrorHandling } from "@/lib/api-handler";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const publishSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

type ProfileRow = {
  id: string;
  username: string;
};

type ExistingHandoffRow = {
  id: string;
  status: "published" | "matched" | "confirmed";
  challenge_code: string;
  owner_accepted_at: string | null;
  payer_accepted_at: string | null;
  expires_at: string;
};

export const POST = withRouteErrorHandling(async (request: Request) => {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const withinLimit = await checkRateLimit(`nearby-publish:${authData.claims.sub}`, { max: 20, windowSeconds: 60 });
  if (!withinLimit) {
    return NextResponse.json({ message: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = publishSchema.safeParse(body ?? {});
  const geo =
    parsed.success && parsed.data.lat !== undefined && parsed.data.lng !== undefined
      ? { geo_lat: roundCoord(parsed.data.lat), geo_lng: roundCoord(parsed.data.lng) }
      : { geo_lat: null, geo_lng: null };

  const admin = createAdminClient();
  const userId = authData.claims.sub;
  const nowIso = new Date().toISOString();

  const [{ data: profile, error: profileError }, { data: destination, error: destinationError }] = await Promise.all([
    admin.from("profiles").select("id, username").eq("id", userId).maybeSingle<ProfileRow>(),
    admin.from("linked_destinations").select("id").eq("user_id", userId).limit(1).maybeSingle(),
  ]);

  if (profileError || !profile) {
    return NextResponse.json({ message: "Profile not found." }, { status: 404 });
  }

  if (destinationError || !destination) {
    return NextResponse.json({ message: "Link a destination before publishing a nearby code." }, { status: 403 });
  }

  // A payer may already be mid-handshake on this owner's current code: never clobber
  // that with a fresh rotation. Report it as-is and let its own bounded handshake
  // TTL (set at claim time) decide when it expires - don't slide it forward here,
  // or an abandoned handshake would never free up its code while this screen stays open.
  const { data: existing } = await admin
    .from("nearby_handoffs")
    .select("id, status, challenge_code, owner_accepted_at, payer_accepted_at, expires_at")
    .eq("owner_user_id", userId)
    .gt("expires_at", nowIso)
    .maybeSingle<ExistingHandoffRow>();

  if (existing && existing.status !== "published") {
    return NextResponse.json({
      handoff: {
        code: existing.challenge_code,
        expiresAt: new Date(existing.expires_at).getTime(),
        status: existing.status,
        ownerAccepted: !!existing.owner_accepted_at,
        payerAccepted: !!existing.payer_accepted_at,
      },
    });
  }

  // No longer sweeping *other* owners' globally-expired rows here (it used
  // to: `delete().lt("expires_at", nowIso)` with no owner filter). That sweep
  // wasn't actually needed for this owner's own row - the upsert below
  // replaces it in place via onConflict regardless of whether it was
  // expired - but deleting a *different* owner's expired row fired a
  // Realtime DELETE event on *their* subscription, which their client
  // correctly-but-wrongly treated as "my match was cancelled" and blanked
  // their screen back to "---" well before their own rotation was due
  // (whenever anyone else happened to call publish). A stray challenge_code
  // collision with an old, expired-but-undeleted row from another owner is
  // still handled below by retrying with a fresh code.
  //
  // `owner_user_id` carries a unique index (one row per owner) - the old
  // delete-then-insert here raced two concurrent publish calls for the same
  // owner (React Strict Mode's double-effect-invocation in dev reproduced it
  // on every single mount): both would delete, then both try to insert, and
  // whichever inserted second hit a unique-constraint violation and 500'd.
  // A single atomic upsert keyed on that same unique index removes the race
  // window entirely - Postgres serializes concurrent upserts on a conflict
  // target instead of one of them erroring.
  let insertedRow: { challenge_code: string; expires_at: string } | null = null;
  let lastError: { code?: string } | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const challengeCode = generateNearbyCode();
    const { data, error } = await admin
      .from("nearby_handoffs")
      .upsert(
        {
          owner_user_id: profile.id,
          challenge_code: challengeCode,
          status: "published",
          payer_user_id: null,
          owner_accepted_at: null,
          payer_accepted_at: null,
          expires_at: new Date(Date.now() + NEARBY_CODE_TTL_MS).toISOString(),
          ...geo,
        },
        { onConflict: "owner_user_id" },
      )
      .select("challenge_code, expires_at")
      .single<{ challenge_code: string; expires_at: string }>();

    if (!error && data) {
      insertedRow = data;
      break;
    }

    lastError = error;
    // Only a challenge_code collision (a different owner already holds that
    // exact code) is worth retrying with a fresh random code - any other
    // error means retrying blindly would just fail the same way again.
    if (error?.code !== "23505") {
      break;
    }
  }

  if (!insertedRow) {
    logger.error("Failed to publish nearby handoff", lastError, { userId });
    return NextResponse.json({ message: "We couldn't publish a nearby code right now." }, { status: 500 });
  }

  return NextResponse.json({
    handoff: {
      code: insertedRow.challenge_code,
      expiresAt: new Date(insertedRow.expires_at).getTime(),
      status: "published",
      ownerAccepted: false,
      payerAccepted: false,
    },
  });
});
