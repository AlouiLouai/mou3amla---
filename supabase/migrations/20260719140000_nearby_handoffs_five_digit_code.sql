-- Nearby handoff codes move from 3 digits (1,000 possibilities) to 5 digits
-- (100,000 possibilities) - see NEARBY_CODE_DIGITS in
-- src/features/payments/lib/nearby-code.ts for the shared client/server
-- source of truth. nearby_handoffs only ever holds short-lived,
-- ephemeral handoff state (no durable history), so clearing it is safe and
-- necessary before tightening the CHECK constraint - existing 3-digit rows
-- would otherwise fail validation against the new 5-digit pattern.
delete from public.nearby_handoffs;

alter table public.nearby_handoffs drop constraint nearby_handoffs_challenge_code_check;
alter table public.nearby_handoffs add constraint nearby_handoffs_challenge_code_check check (challenge_code ~ '^\d{5}$');
