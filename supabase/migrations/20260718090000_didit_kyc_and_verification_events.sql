create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists didit_latest_status text,
  add column if not exists didit_session_id text;

create table if not exists public.verification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  previous_status public.verification_status,
  next_status public.verification_status not null,
  source text not null,
  provider_session_id text,
  provider_status text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists verification_events_user_created_idx
  on public.verification_events (user_id, created_at desc);

alter table public.verification_events enable row level security;

drop policy if exists "verification_events_select_own" on public.verification_events;
create policy "verification_events_select_own"
on public.verification_events
for select
to authenticated
using (auth.uid() = user_id);
