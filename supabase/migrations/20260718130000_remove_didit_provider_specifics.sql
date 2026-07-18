-- Didit is fully removed from the app; only the demo KYC flow remains until
-- an INPDP-approved provider is selected. Keep one generic status column
-- (still needed to render the "(demo)" label transparently) and drop the
-- rest, which only existed to correlate a Didit hosted session for
-- webhook/poll matching that no longer exists.
alter table public.profiles
  rename column didit_latest_status to kyc_provider_status;

alter table public.profiles
  drop column if exists didit_session_id,
  drop column if exists didit_status_event_at;

drop table if exists public.didit_webhook_events;
