import Link from "next/link";
import { serverEnv } from "@/config/env.server";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";
import { getCurrentAppUserFresh, requireCurrentAppUserFresh } from "@/features/auth/server/dal";
import { syncDiditSessionStatus } from "@/features/onboarding/server/didit";

type VerifyIdentityReturnPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function VerifyIdentityReturnPage(props: VerifyIdentityReturnPageProps) {
  let user = await requireCurrentAppUserFresh();
  const searchParams = await props.searchParams;

  if (serverEnv.DIDIT_API_KEY && user.diditSessionId && user.verificationStatus !== "verified") {
    await syncDiditSessionStatus(user.diditSessionId, user.id);
    user = (await getCurrentAppUserFresh()) ?? user;
  }

  const hintedStatus = typeof searchParams.status === "string" ? searchParams.status : user.diditLatestStatus;

  return (
    <div
      className="mou3amla-viewport-h flex flex-1 flex-col justify-center px-5 py-[max(1.2rem,env(safe-area-inset-top))]"
      style={{ background: `linear-gradient(180deg, ${mou3amla.surface} 0%, ${mou3amla.bg} 100%)` }}
    >
      <div
        className="mx-auto w-full max-w-md rounded-[30px] border p-5"
        style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
      >
        <div className="mb-2 text-[11px] font-black uppercase tracking-[0.24em]" style={{ color: mou3amla.textFaint }}>
          Didit callback
        </div>
        <h1 className="mb-2 text-[1.8rem] font-black leading-none">Back inside Mou3amla.</h1>
        <p className="mb-4 text-[12px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
          This page re-checks your Didit session when you land back in Mou3amla, then keeps the webhook as the background source of truth.
        </p>

        <div
          className="mb-5 rounded-[22px] border px-4 py-3 text-[12px]"
          style={{ background: alpha(mou3amla.accent, 0.06), borderColor: alpha(mou3amla.accent, 0.14), color: mou3amla.text }}
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
          style={{ background: mou3amla.accent, color: "#FFFFFF" }}
        >
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}
