-- Postgres security audit (2026-07-25) - closes real and dormant client-write
-- attack surface that has existed since each table's creation, unrelated to
-- any single feature. Every table below is written exclusively by the
-- service-role admin client in app code (verified: zero client-side
-- `.from(...)` calls against any of them) - `linked_destinations` is
-- deliberately excluded because it has genuine, correctly-scoped
-- self-service RLS policies (`auth.uid() = user_id` on every command) and is
-- a real, intentional direct-write surface. REVOKE on a privilege a role
-- doesn't actually hold is a safe no-op, so this is safe to run even where a
-- role never had the grant in the first place.

-- 1. CRITICAL, confirmed exploitable: payment_transactions_insert_sender
-- (existing RLS policy) only checks auth.uid() = sender_user_id - nothing
-- validates amount, status, recipient existence/verification, duplicate
-- submission, or the BCT sandbox cap, all of which createPaymentIntent
-- (the only real write path - payments/server/actions.ts) enforces. Any
-- authenticated user could have called
-- `supabase.from('payment_transactions').insert({sender_user_id: self,
-- recipient_user_id: <any other user>, status: 'confirmed', ...})` directly
-- from the browser, bypassing every one of those checks - and the forged row
-- would have been visible in the *victim's own* Activity screen too, since
-- payment_transactions_select_participant shows rows where auth.uid() =
-- recipient_user_id. No real money can move (zero-liability by design), but
-- this forges the audit trail the BCT sandbox dossier leans on as trustworthy.
revoke insert, update, delete on public.payment_transactions from anon, authenticated;

-- 2. MEDIUM, dormant: accept_nearby_handoff(p_id, p_role) has no auth.uid()
-- ownership check in its body at all - it trusts whatever p_role the caller
-- claims and updates any row by p_id. It was only *not* exploitable because
-- nearby_handoffs has no UPDATE policy, so RLS silently no-ops the mutation
-- for anon/authenticated - an accident of omission, not a designed control.
-- check_rate_limit already gets this right (service_role-only); this closes
-- the same gap here.
revoke execute on function public.accept_nearby_handoff(uuid, text) from public, anon, authenticated;
grant execute on function public.accept_nearby_handoff(uuid, text) to service_role;

-- 3. Defense in depth: the same "a table-level GRANT exists, only the
-- absence of a matching RLS policy is stopping it" pattern existed on every
-- table below - safe today, but fragile, because it depends on nobody ever
-- adding a policy for that command without independently remembering to
-- scope it perfectly (which is exactly how #1 above happened). Explicit
-- REVOKE is a durable signal of intent instead of an accident of omission.
revoke insert, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.nearby_handoffs from anon, authenticated;
revoke insert, delete on public.notifications from anon, authenticated;
revoke insert, update, delete on public.passkeys from anon, authenticated;
revoke insert, update, delete on public.verification_events from anon, authenticated;
revoke insert, update, delete on public.rate_limits from anon, authenticated;
