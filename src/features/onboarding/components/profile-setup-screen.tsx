import { alpha, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";

function previewUsername(fullName: string): string {
  const slug = fullName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return slug || "your_username";
}

export function ProfileSetupScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { state, derived, actions } = squadApp;
  const usernamePreview = previewUsername(state.fullNameInput);

  return (
    <div className="flex flex-1 flex-col overflow-auto px-6 pt-[max(2.25rem,env(safe-area-inset-top))] pb-8">
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-1.5 text-xl font-extrabold tracking-tight">Create your profile</div>
        <div className="mb-6 text-[13px] leading-relaxed" style={{ color: squad.textMuted }}>
          Your @username is how people find and pay you — it&apos;s the only
          thing SQUAD shares publicly.
        </div>

        <div className="mb-2 text-xs font-semibold tracking-wide" style={{ color: squad.textMuted }}>
          FULL NAME
        </div>
        <div
          className="mb-3 flex items-center rounded-2xl border px-4 py-3"
          style={{ background: squad.card, borderColor: squad.borderStrong }}
        >
          <input
            autoFocus
            value={state.fullNameInput}
            onChange={(e) => actions.onFullNameChange(e.target.value)}
            placeholder="Youssef Trabelsi"
            className="flex-1 border-none bg-transparent text-[15px] outline-none"
            style={{ color: squad.text }}
          />
        </div>

        <div
          className="mb-5 flex w-fit items-center gap-1 rounded-full border px-3 py-1.5 font-mono text-[13px]"
          style={{ background: alpha(squad.accent, 0.1), borderColor: alpha(squad.accent, 0.25), color: squad.accent }}
        >
          @{usernamePreview}
        </div>

        <button
          type="button"
          onClick={actions.toggleProfessional}
          className="mb-4 flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left"
          style={{ background: squad.card, borderColor: squad.border }}
        >
          <div>
            <div className="text-[13.5px] font-bold">Mode Professionnel</div>
            <div className="text-[11.5px]" style={{ color: squad.textMuted }}>
              For merchants/freelancers — enables El Fatoora invoicing.
            </div>
          </div>
          <div
            className="flex h-6 w-10 shrink-0 items-center rounded-full px-0.5 transition-colors"
            style={{ background: derived.account.profile.isProfessional ? squad.accent : "rgba(255,255,255,0.15)" }}
          >
            <div
              className="size-5 rounded-full bg-white transition-transform"
              style={{ transform: derived.account.profile.isProfessional ? "translateX(16px)" : "translateX(0)" }}
            />
          </div>
        </button>

        {derived.account.profile.isProfessional && (
          <>
            <div className="mb-2 text-xs font-semibold tracking-wide" style={{ color: squad.textMuted }}>
              MATRICULE FISCAL
            </div>
            <div
              className="mb-5 flex items-center rounded-2xl border px-4 py-3"
              style={{ background: squad.card, borderColor: squad.borderStrong }}
            >
              <input
                value={state.matriculeFiscalInput}
                onChange={(e) => actions.onMatriculeFiscalChange(e.target.value)}
                placeholder="0914089H/A/M/000"
                className="flex-1 border-none bg-transparent font-mono text-[15px] outline-none"
                style={{ color: squad.text }}
              />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={actions.submitProfile}
          disabled={!state.fullNameInput.trim()}
          className="rounded-2xl py-3.5 text-center text-[15px] font-bold transition-opacity disabled:opacity-50"
          style={{ background: squad.accent, color: squad.bg }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
