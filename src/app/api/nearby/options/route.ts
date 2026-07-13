import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type NearbyRow = {
  challenge_code: string;
};

function generateDecoy(excluded: Set<string>): string {
  let code = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  while (excluded.has(code)) {
    code = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
  }

  return code;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function GET() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const userId = authData.claims.sub;
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await admin
    .from("nearby_handoffs")
    .select("challenge_code")
    .neq("owner_user_id", userId)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(4);

  if (error) {
    return NextResponse.json({ message: "We couldn't load nearby codes right now." }, { status: 500 });
  }

  const realCodes = Array.from(new Set(((rows ?? []) as NearbyRow[]).map((row) => row.challenge_code))).slice(0, 4);
  const excluded = new Set(realCodes);
  const options = [...realCodes];

  while (options.length < 4) {
    const decoy = generateDecoy(excluded);
    excluded.add(decoy);
    options.push(decoy);
  }

  return NextResponse.json({
    options: shuffle(options),
    hasLiveMatch: realCodes.length > 0,
  });
}
