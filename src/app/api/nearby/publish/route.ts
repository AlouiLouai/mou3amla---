import { NextResponse } from "next/server";
import { z } from "zod";
import { BCT_SANDBOX_TEST_LIMIT_TND, NEARBY_CODE_TTL_MS } from "@/features/payments/constants";
import { roundCoord } from "@/features/payments/lib/geolocation";
import { generateNearbyCode } from "@/features/payments/lib/nearby-code";
import { resolveUsername } from "@/features/payments/server/nearby-match";
import { withRouteErrorHandling } from "@/lib/api-handler";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const publishSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  amount: z.number().positive().max(BCT_SANDBOX_TEST_LIMIT_TND).optional(),
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
  amount: number | null;
  payer_user_id: string | null;
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

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const geo =
    parsed.data.lat !== undefined && parsed.data.lng !== undefined
      ? { geo_lat: roundCoord(parsed.data.lat), geo_lng: roundCoord(parsed.data.lng) }
      : { geo_lat: null, geo_lng: null };

  const amount = parsed.data.amount ?? null;

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

  // Never clobber a code a payer is already mid-handshake on - report it
  // as-is and let its own handshake TTL (set at claim time) decide when it expires.
  const { data: existing } = await admin
    .from("nearby_handoffs")
    .select("id, status, challenge_code, owner_accepted_at, payer_accepted_at, expires_at, amount, payer_user_id")
    .eq("owner_user_id", userId)
    .gt("expires_at", nowIso)
    .maybeSingle<ExistingHandoffRow>();

  if (existing && existing.status !== "published") {
    const counterpartUsername = existing.payer_user_id ? await resolveUsername(existing.payer_user_id) : null;

    return NextResponse.json({
      handoff: {
        code: existing.challenge_code,
        expiresAt: new Date(existing.expires_at).getTime(),
        status: existing.status,
        ownerAccepted: !!existing.owner_accepted_at,
        payerAccepted: !!existing.payer_accepted_at,
        amount: existing.amount,
        counterpartUsername,
      },
    });
  }

  // Deliberately doesn't sweep *other* owners' expired rows here - deleting
  // one fires a Realtime DELETE on their own subscription, wrongly reading
  // as "my match was cancelled". A stray challenge_code collision is instead
  // handled below by retrying with a fresh code. The upsert (rather than
  // delete-then-insert) also removes a real unique-constraint race between
  // concurrent publish calls for the same owner (e.g. Strict Mode's double
  // effect invocation) - Postgres serializes concurrent upserts on the
  // conflict target instead of one erroring.
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
          amount,
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
      amount,
      // A fresh rotation always clears payer_user_id back to null in the
      // upsert above - there's never a counterpart to know about yet here.
      counterpartUsername: null,
    },
  });
});
