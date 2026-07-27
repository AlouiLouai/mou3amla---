-- Phase 1 of the symmetric host/guest nearby redesign: `owner_user_id`/
-- `payer_user_id` stay generic host/guest identity slots (not renamed) -
-- `direction` is the new source of truth for which way money flows.
-- 'host_receives' (today's only behavior - the host is getting paid, the
-- guest pays) vs 'host_pays' (the host is paying, the guest gets paid).
-- Defaulting to 'host_receives' makes every existing row and every route
-- that doesn't yet send `direction` behave exactly as before.
alter table public.nearby_handoffs
  add column if not exists direction text not null default 'host_receives',
  add column if not exists amount numeric(12,3),
  add column if not exists amount_source text;

alter table public.nearby_handoffs
  add constraint nearby_handoffs_direction_check
  check (direction in ('host_receives', 'host_pays'));

-- Defense-in-depth mirror of BCT_SANDBOX_TEST_LIMIT_TND
-- (src/features/payments/constants.ts) - keep these two in sync manually,
-- same tradeoff already accepted for NEARBY_CODE_DIGITS/challenge_code's
-- 5-digit CHECK constraint. createPaymentIntent's own zod validation remains
-- the authoritative cap check; this only stops an obviously-bad amount from
-- ever being written to a handoff row in the first place.
alter table public.nearby_handoffs
  add constraint nearby_handoffs_amount_check
  check (amount is null or (amount > 0 and amount <= 500));

-- 'host': the host supplied it at publish time (fixed for that code's whole
-- life, persists across different guests trying the same still-open code).
-- 'guest': the host left it blank and whichever guest matched had to supply
-- it (see /api/nearby/set-amount) - transient, cleared on payer-cancel so a
-- stale guest-typed amount doesn't leak into the next guest who claims the
-- same still-published code.
alter table public.nearby_handoffs
  add constraint nearby_handoffs_amount_source_check
  check (amount_source is null or amount_source in ('host', 'guest'));

alter table public.nearby_handoffs
  add constraint nearby_handoffs_amount_source_consistency
  check ((amount is null) = (amount_source is null));

-- No new grant statements needed: 20260725110000_rls_grants_hardening.sql
-- already revokes insert/update/delete on this table from anon/authenticated
-- table-wide, which covers these new columns automatically.
