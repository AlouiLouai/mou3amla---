import Link from "next/link";
import { alpha, cardShadow, squad } from "@/features/squad/constants";
import { requireCurrentAppUser } from "@/features/auth/server/dal";

type VerifyIdentityReturnPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function VerifyIdentityReturnPage(props: VerifyIdentityReturnPageProps) {
  const [user, searchParams] = await Promise.all([requireCurrentAppUser(), props.searchParams]);
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
          This page is only a return checkpoint. The final trusted verification state still comes from the Didit webhook.
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
