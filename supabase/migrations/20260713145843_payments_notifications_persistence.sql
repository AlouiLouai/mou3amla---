create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'routing_type'
  ) then
    create type public.routing_type as enum ('wallet_tag', 'merchant_id', 'rib');
  end if;

  if not exists (
    select 1 from pg_type where typname = 'transaction_status'
  ) then
    create type public.transaction_status as enum ('initiated', 'confirmed', 'failed');
  end if;

  if not exists (
    select 1 from pg_type where typname = 'notification_type'
  ) then
    create type public.notification_type as enum ('payment_received', 'payment_sent', 'verification_approved', 'verification_pending', 'system');
  end if;
end
$$;

create table if not exists public.linked_destinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider_id text not null,
  name text not null,
  network text not null,
  color text not null,
  initials text not null,
  routing_type public.routing_type not null,
  routing_value text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists linked_destinations_user_provider_routing_unique
  on public.linked_destinations (user_id, provider_id, routing_value);

create unique index if not exists linked_destinations_one_default_per_user
  on public.linked_destinations (user_id)
  where is_default;

create index if not exists linked_destinations_user_created_idx
  on public.linked_destinations (user_id, created_at desc);

drop trigger if exists set_linked_destinations_updated_at on public.linked_destinations;
create trigger set_linked_destinations_updated_at
before update on public.linked_destinations
for each row
execute function public.set_updated_at();

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  ref_id text not null unique,
  sender_user_id uuid not null references public.profiles (id) on delete cascade,
  recipient_user_id uuid references public.profiles (id) on delete set null,
  sender_destination_id uuid references public.linked_destinations (id) on delete set null,
  recipient_destination_id uuid references public.linked_destinations (id) on delete set null,
  amount numeric(12,3) not null check (amount > 0),
  currency text not null default 'TND',
  recipient_username text not null,
  recipient_display_name text,
  channel text not null default 'tunpay',
  status public.transaction_status not null default 'initiated',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists payment_transactions_sender_created_idx
  on public.payment_transactions (sender_user_id, created_at desc);

create index if not exists payment_transactions_recipient_created_idx
  on public.payment_transactions (recipient_user_id, created_at desc);

drop trigger if exists set_payment_transactions_updated_at on public.payment_transactions;
create trigger set_payment_transactions_updated_at
before update on public.payment_transactions
for each row
execute function public.set_updated_at();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_user_id uuid references public.profiles (id) on delete set null,
  transaction_id uuid references public.payment_transactions (id) on delete set null,
  type public.notification_type not null,
  title text not null,
  body text not null,
  unread boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_user_unread_created_idx
  on public.notifications (user_id, unread, created_at desc);

drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at
before update on public.notifications
for each row
execute function public.set_updated_at();

alter table public.linked_destinations enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "linked_destinations_select_own" on public.linked_destinations;
create policy "linked_destinations_select_own"
on public.linked_destinations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "linked_destinations_insert_own" on public.linked_destinations;
create policy "linked_destinations_insert_own"
on public.linked_destinations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "linked_destinations_update_own" on public.linked_destinations;
create policy "linked_destinations_update_own"
on public.linked_destinations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "linked_destinations_delete_own" on public.linked_destinations;
create policy "linked_destinations_delete_own"
on public.linked_destinations
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "payment_transactions_select_participant" on public.payment_transactions;
create policy "payment_transactions_select_participant"
on public.payment_transactions
for select
to authenticated
using (auth.uid() = sender_user_id or auth.uid() = recipient_user_id);

drop policy if exists "payment_transactions_insert_sender" on public.payment_transactions;
create policy "payment_transactions_insert_sender"
on public.payment_transactions
for insert
to authenticated
with check (auth.uid() = sender_user_id);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
