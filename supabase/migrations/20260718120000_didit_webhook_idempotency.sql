create table if not exists public.didit_webhook_events (
  event_id text primary key,
  received_at timestamptz not null default timezone('utc', now())
);

alter table public.didit_webhook_events enable row level security;

-- No policies: only the service-role admin client (which bypasses RLS) ever
-- touches this table - it exists purely to make webhook delivery replays
-- (Didit retries up to 2x on 5xx/404) a no-op instead of reprocessing.

alter table public.profiles
  add column if not exists didit_status_event_at timestamptz;
