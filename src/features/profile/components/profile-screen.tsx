import { useState, type ReactNode } from "react";
import { BadgeCheck, Bell, BookOpen, ChevronRight, FileText, Globe, Landmark, LifeBuoy, LogOut, Moon, Share2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { ThemeToggle } from "@/features/mou3amla/components/theme-toggle";
import { alpha, cardShadow, igGradient, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { statusToneColor } from "@/features/mou3amla/status-tone";
import { LanguageSheet } from "@/features/i18n/components/language-sheet";
import { useTranslation } from "@/features/i18n/language-store";
import { LANGUAGES } from "@/features/i18n/translations";
import { InfoSheet } from "@/features/profile/components/info-sheet";

function verificationTone(status: string, isDemoApproval: boolean) {
  if (status === "verified") {
    const color = statusToneColor("positive");
    return { bg: alpha(color, 0.12), color, label: isDemoApproval ? "Verified profile (demo)" : "Verified profile" };
  }
  if (status === "pending") {
    const color = statusToneColor("pending");
    return { bg: alpha(color, 0.14), color, label: "Verification in review" };
  }
  if (status === "rejected") {
    const color = statusToneColor("negative");
    return { bg: alpha(color, 0.12), color, label: "Action required" };
  }
  const color = statusToneColor("neutral");
  return { bg: alpha(color, 0.1), color, label: "Not verified" };
}

type ActiveSheet = "language" | "support" | "terms" | "privacy" | null;

export function ProfileScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { derived, actions } = mou3amlaApp;
  const account = derived.account;
  const { t, language } = useTranslation();
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const initials = account.profile.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const verification = verificationTone(account.profile.verificationStatus, account.profile.kycProviderStatus === "Demo Approved");
  const footer = renderAppFooter("profile", actions);
  const currentLanguageLabel = LANGUAGES.find((option) => option.id === language)?.nativeLabel ?? language;

  const copyInviteLink = () => {
    const link = `mou3amla.app/u/${account.profile.username}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(link);
    }
    toast.success("Invite link copied", { description: link });
  };

  return (
    <ScreenFrame footer={footer} contentClassName="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <div className="mb-4 rounded-[28px] border px-5 py-5" style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full p-[2.5px]" style={{ background: igGradient }}>
              <div className="flex size-full items-center justify-center rounded-full text-lg font-black text-white" style={{ background: mou3amla.hero }}>
                {initials || "SQ"}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[1.05rem] font-black">{account.profile.fullName || "Mou3amla user"}</div>
              <div className="mt-1 text-[12px] font-semibold" style={{ color: mou3amla.textMuted }}>
                @{account.profile.username}
              </div>
              {account.profile.phone ? (
                <div className="mt-1 text-[11px] font-medium" style={{ color: mou3amla.textFaint }}>
                  {account.profile.phone}
                </div>
              ) : null}
            </div>
          </div>

          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-black"
            style={{ background: verification.bg, color: verification.color }}
          >
            <BadgeCheck className="size-4" />
            <span>{verification.label}</span>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <InfoTile label={t("profile.stat.destinations")} value={String(account.wallets.length)} />
          <InfoTile label={t("profile.stat.payments")} value={String(account.activityLog.length)} />
          <InfoTile label={t("profile.stat.unread")} value={String(derived.unreadNotifications)} />
        </div>

        <SectionLabel>{t("profile.section.preferences")}</SectionLabel>
        <div className="mb-4 flex flex-col gap-2">
          <div
            className="flex items-center justify-between rounded-[22px] border px-4 py-3"
            style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
          >
            <span className="flex items-center gap-2.5 text-[13px] font-semibold">
              <Moon className="size-4" style={{ color: mou3amla.accent }} />
              {t("profile.darkMode")}
            </span>
            <ThemeToggle onLabel={t("profile.darkMode.on")} offLabel={t("profile.darkMode.off")} />
          </div>
          <ActionCard
            icon={<Globe className="size-4" style={{ color: mou3amla.accent }} />}
            label={t("profile.language")}
            value={currentLanguageLabel}
            onClick={() => setActiveSheet("language")}
          />
          <ActionCard
            icon={<Bell className="size-4" style={{ color: mou3amla.accent }} />}
            label={t("profile.notificationsPreference")}
            value={`${derived.unreadNotifications} unread`}
            onClick={actions.goNotifications}
          />
        </div>

        <SectionLabel>{t("profile.section.account")}</SectionLabel>
        <div className="mb-4 flex flex-col gap-2">
          <LinkCard
            href="/verify-identity"
            icon={<Landmark className="size-4" style={{ color: mou3amla.accent }} />}
            label={t("profile.identityVerification")}
            value={account.profile.verificationStatus}
          />
          <InfoRow
            icon={<ShieldCheck className="size-4" style={{ color: mou3amla.accent }} />}
            label={t("profile.passkeysSecurity")}
            value={`${account.profile.passkeyCount} device${account.profile.passkeyCount === 1 ? "" : "s"}`}
          />
        </div>

        <SectionLabel>{t("profile.section.others")}</SectionLabel>
        <div className="mb-4 flex flex-col gap-2">
          <ActionCard
            icon={<LifeBuoy className="size-4" style={{ color: mou3amla.accent }} />}
            label={t("profile.support")}
            value=""
            onClick={() => setActiveSheet("support")}
          />
          <ActionCard
            icon={<FileText className="size-4" style={{ color: mou3amla.accent }} />}
            label={t("profile.termsOfUse")}
            value=""
            onClick={() => setActiveSheet("terms")}
          />
          <ActionCard
            icon={<ShieldCheck className="size-4" style={{ color: mou3amla.accent }} />}
            label={t("profile.privacyPolicy")}
            value=""
            onClick={() => setActiveSheet("privacy")}
          />
          <ActionCard
            icon={<BookOpen className="size-4" style={{ color: mou3amla.accent }} />}
            label={t("profile.guidedTour")}
            value=""
            onClick={() => toast(t("guidedTour.comingSoon"))}
          />
        </div>

        <button
          type="button"
          onClick={copyInviteLink}
          className="mb-4 w-full rounded-[22px] p-[1.5px] text-left"
          style={{ background: igGradient }}
        >
          <div className="flex items-center justify-between gap-3 rounded-[20.5px] px-4 py-3.5" style={{ background: mou3amla.card }}>
            <span className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: alpha(mou3amla.accent, 0.12) }}>
                <Share2 className="size-4" style={{ color: mou3amla.accent }} />
              </span>
              <span>
                <span className="block text-[13px] font-black">{t("profile.inviteFriends")}</span>
                <span className="block text-[10.5px] font-semibold" style={{ color: mou3amla.textMuted }}>
                  {t("profile.inviteFriends.subtitle")}
                </span>
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0" style={{ color: mou3amla.textFaint }} />
          </div>
        </button>

        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center justify-between rounded-[22px] border px-4 py-3 text-left"
            style={{ background: mou3amla.card, borderColor: alpha(mou3amla.destructive, 0.22), boxShadow: cardShadow }}
          >
            <span className="flex items-center gap-2.5 text-[13px] font-semibold" style={{ color: mou3amla.destructive }}>
              <LogOut className="size-4" />
              {t("profile.logout")}
            </span>
          </button>
        </form>

        <LanguageSheet open={activeSheet === "language"} onClose={() => setActiveSheet(null)} />
        <InfoSheet
          open={activeSheet === "support"}
          title={t("sheet.support.title")}
          body={t("sheet.support.body")}
          closeLabel={t("sheet.close")}
          onClose={() => setActiveSheet(null)}
        />
        <InfoSheet
          open={activeSheet === "terms"}
          title={t("sheet.terms.title")}
          body={t("sheet.terms.body")}
          closeLabel={t("sheet.close")}
          onClose={() => setActiveSheet(null)}
        />
        <InfoSheet
          open={activeSheet === "privacy"}
          title={t("sheet.privacy.title")}
          body={t("sheet.privacy.body")}
          closeLabel={t("sheet.close")}
          onClose={() => setActiveSheet(null)}
        />
    </ScreenFrame>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: mou3amla.textFaint }}>
      {children}
    </div>
  );
}

function LinkCard({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-[22px] border px-4 py-3 text-left"
      style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
    >
      <span className="flex items-center gap-2.5 text-[13px] font-semibold">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-1 text-xs font-bold capitalize" style={{ color: mou3amla.textFaint }}>
        {value} <ChevronRight className="size-3.5" />
      </span>
    </a>
  );
}

function ActionCard({
  icon,
  label,
  value,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-[22px] border px-4 py-3 text-left"
      style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
    >
      <span className="flex items-center gap-2.5 text-[13px] font-semibold">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-1 text-xs font-bold capitalize" style={{ color: mou3amla.textFaint }}>
        {value} <ChevronRight className="size-3.5" />
      </span>
    </button>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-[22px] border px-4 py-3"
      style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
    >
      <span className="flex items-center gap-2.5 text-[13px] font-semibold">
        {icon}
        {label}
      </span>
      <span className="text-xs font-bold" style={{ color: mou3amla.textFaint }}>
        {value}
      </span>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border px-4 py-4" style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}>
      <div className="text-[11px] font-semibold" style={{ color: mou3amla.textMuted }}>
        {label}
      </div>
      <div className="mt-1 text-[13px] font-black">{value}</div>
    </div>
  );
}
