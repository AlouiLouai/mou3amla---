-- Supabase advisor fixes (security + performance), see docs/06-conventions.md.

-- 1. Function search_path: unqualified identifiers inside a SECURITY-relevant
-- trigger function should not depend on the caller's search_path.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 2. check_rate_limit is only ever called from server code via the
-- service-role admin client, which bypasses grants entirely - it should
-- never have been reachable by anon/authenticated over PostgREST.
revoke execute on function public.check_rate_limit(text, integer, integer) from public;
revoke execute on function public.check_rate_limit(text, integer, integer) from anon;
revoke execute on function public.check_rate_limit(text, integer, integer) from authenticated;

-- 3. Missing covering indexes on foreign keys (flagged by the performance
-- advisor) - matters most as payment_transactions/notifications grow past
-- a few thousand rows.
create index if not exists notifications_actor_user_id_idx
  on public.notifications (actor_user_id);

create index if not exists notifications_transaction_id_idx
  on public.notifications (transaction_id);

create index if not exists payment_transactions_recipient_destination_id_idx
  on public.payment_transactions (recipient_destination_id);

create index if not exists payment_transactions_sender_destination_id_idx
  on public.payment_transactions (sender_destination_id);

-- 4. RLS policies re-evaluating auth.uid() per row instead of once per query
-- (`(select auth.uid())` lets Postgres treat it as a stable subplan) -
-- meaningful once these tables hold real user volume.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "linked_destinations_select_own" on public.linked_destinations;
create policy "linked_destinations_select_own"
on public.linked_destinations
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "linked_destinations_insert_own" on public.linked_destinations;
create policy "linked_destinations_insert_own"
on public.linked_destinations
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "linked_destinations_update_own" on public.linked_destinations;
create policy "linked_destinations_update_own"
on public.linked_destinations
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "linked_destinations_delete_own" on public.linked_destinations;
create policy "linked_destinations_delete_own"
on public.linked_destinations
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "payment_transactions_select_participant" on public.payment_transactions;
create policy "payment_transactions_select_participant"
on public.payment_transactions
for select
to authenticated
using ((select auth.uid()) = sender_user_id or (select auth.uid()) = recipient_user_id);

drop policy if exists "payment_transactions_insert_sender" on public.payment_transactions;
create policy "payment_transactions_insert_sender"
on public.payment_transactions
for insert
to authenticated
with check ((select auth.uid()) = sender_user_id);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "verification_events_select_own" on public.verification_events;
create policy "verification_events_select_own"
on public.verification_events
for select
to authenticated
using ((select auth.uid()) = user_id);
