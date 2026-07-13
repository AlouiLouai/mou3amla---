import Link from "next/link";
import { env } from "@/config/env";
import { alpha, cardShadow, squad } from "@/features/squad/constants";
import { getCurrentAppUserFresh, requireCurrentAppUserFresh } from "@/features/auth/server/dal";
import { syncDiditSessionStatus } from "@/features/onboarding/server/didit";

type VerifyIdentityReturnPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function VerifyIdentityReturnPage(props: VerifyIdentityReturnPageProps) {
  let user = await requireCurrentAppUserFresh();
  const searchParams = await props.searchParams;

  if (env.DIDIT_API_KEY && user.diditSessionId && user.verificationStatus !== "verified") {
    await syncDiditSessionStatus(user.diditSessionId, user.id);
    user = (await getCurrentAppUserFresh()) ?? user;
  }

  const hintedStatus = typeof searchParams.status === "string" ? searchParams.status : user.diditLatestStatus;

  return (
    <div
      className="flex min-h-[100dvh] flex-1 flex-col justify-center px-5 py-[max(1.2rem,env(safe-area-inset-top))]"
      style={{ background: `linear-gradient(180deg, ${squad.surface} 0%, ${squad.bg} 100%)` }}
    >
      <div
        className="mx-auto w-full max-w-md rounded-[30px] border p-5"
        style={{ background: squad.card, borderColor: squad.border, boxShadow: cardShadow }}
      >
        <div className="mb-2 text-[11px] font-black uppercase tracking-[0.24em]" style={{ color: squad.textFaint }}>
          Didit callback
        </div>
        <h1 className="mb-2 text-[1.8rem] font-black leading-none">Back inside SQUAD.</h1>
        <p className="mb-4 text-[12px] leading-relaxed" style={{ color: squad.textMuted }}>
          This page re-checks your Didit session when you land back in SQUAD, then keeps the webhook as the background source of truth.
        </p>

        <div
          className="mb-5 rounded-[22px] border px-4 py-3 text-[12px]"
          style={{ background: alpha(squad.accent, 0.06), borderColor: alpha(squad.accent, 0.14), color: squad.text }}
        >
          Database status: <strong>{user.verificationStatus}</strong>
          {hintedStatus ? (
            <>
              {" "}
              - Didit hint: <strong>{hintedStatus}</strong>
            </>
          ) : null}
        </div>

        <Link
          href="/home"
          className="inline-flex w-full items-center justify-center rounded-[18px] py-3.5 text-[15px] font-black"
          style={{ background: squad.accent, color: "#FFFFFF" }}
        >
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}
