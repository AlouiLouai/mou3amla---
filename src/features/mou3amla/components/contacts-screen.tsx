import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AppHeader } from "@/features/mou3amla/components/app-header";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { cardShadow, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";

// "Friends" here just means every unique person this account has ever sent
// money to - there's no separate contacts table, this is derived from the
// activity log (see getRecentContacts in hooks/utils.ts).
export function ContactsScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { derived, actions } = mou3amlaApp;
  const header = (
    <AppHeader
      profile={derived.account.profile}
      unreadNotifications={derived.unreadNotifications}
      onNotifications={actions.goNotifications}
      onBack={actions.goHome}
    />
  );
  const footer = renderAppFooter("contacts", actions);

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-4 pb-4">
      <div className="mb-3">
        <div className="text-[15px] font-black tracking-tight">Quick send</div>
        <p className="text-[11px] font-semibold" style={{ color: mou3amla.textFaint }}>
          Everyone you&apos;ve sent a payment to before.
        </p>
      </div>

      {derived.allContacts.length === 0 ? (
        <EmptyState icon={<Users className="size-5" />} title="No contacts yet" body="Send your first payment to see people here for quick pick." />
      ) : (
        <div className="flex flex-col gap-2">
          {derived.allContacts.map((contact) => (
            <button
              key={contact.handle}
              type="button"
              onClick={() => {
                actions.goGenerateIntent();
                actions.onRecipientChange(contact.username);
              }}
              className="flex items-center gap-3 rounded-[20px] border p-3 text-left"
              style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
            >
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white"
                style={{ background: contact.color }}
              >
                {contact.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-black">{contact.name}</div>
                <div className="text-[11px] font-semibold" style={{ color: mou3amla.textMuted }}>
                  {contact.handle}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </ScreenFrame>
  );
}
