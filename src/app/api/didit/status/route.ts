import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { getCurrentAppUserFresh } from "@/features/auth/server/dal";
import { syncDiditSessionStatus } from "@/features/onboarding/server/didit";

export const dynamic = "force-dynamic";

function responsePayload(user: NonNullable<Awaited<ReturnType<typeof getCurrentAppUserFresh>>>) {
  return {
    profile: {
      verificationStatus: user.verificationStatus,
      diditLatestStatus: user.diditLatestStatus,
      diditSessionId: user.diditSessionId,
    },
  };
}

export async function GET() {
  const user = await getCurrentAppUserFresh();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!env.DIDIT_API_KEY || !user.diditSessionId || user.verificationStatus === "verified") {
    return NextResponse.json(responsePayload(user), {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  await syncDiditSessionStatus(user.diditSessionId, user.id);
  const refreshedUser = (await getCurrentAppUserFresh()) ?? user;

  return NextResponse.json(responsePayload(refreshedUser), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
