-- 1. Column-level privilege hardening on public.profiles.
--
-- `profiles_update_own` (RLS) only restricts which ROWS an authenticated
-- user can touch (auth.uid() = id) - it says nothing about which COLUMNS.
-- Supabase's default project privileges grant UPDATE on every column of a
-- new table to the `authenticated` role, so any signed-in user could call
-- PostgREST directly (PATCH /rest/v1/profiles?id=eq.<own-id>) with a body
-- like {"verification_status":"verified"} and self-approve their own KYC,
-- completely bypassing the demo verification flow - `verification_status`
-- is exactly the field send-money gates recipients on
-- (`recipient.verification_status !== "verified"`). The app itself never
-- writes to `profiles` this way (every write goes through the service-role
-- admin client in server actions), so this is a pure hardening: it only
-- closes a direct-REST attack path a browser inspector or curl could reach
-- with nothing more than the public anon key and a valid session.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- 2. `signed_token` was write-only dead weight: /api/nearby/publish minted
-- and stored it, but nothing ever read it back - not the client response,
-- not nearby-match.ts, not the accept RPC. Worse, it's an HMAC-*signed* (not
-- encrypted) token: its base64url payload segment decodes in plain
-- JavaScript with no secret required, and it embeds the owner's
-- recipientUserId + username. Column-level SELECT grants can't be trusted to
-- keep it out of a Realtime broadcast (logical replication ships the whole
-- physical row, independent of PostgREST column grants), and this table is
-- about to be added to the realtime publication below - so instead of
-- threading that risk through, just remove the column outright, since
-- nothing needs it.
alter table public.nearby_handoffs drop column if exists signed_token;

-- 3. Enable Realtime on nearby_handoffs so match/accept status changes reach
-- both phones the instant they happen, replacing the 1.5s poll
-- (use-qr-nearby-actions.ts) with a websocket push - same pattern already
-- used for public.notifications. Safe now that the row carries no
-- pre-reveal identity payload (see above) - buildNearbyMatchPayload still
-- only resolves and returns the counterparty's profile server-side, once
-- status is "confirmed".
alter publication supabase_realtime add table public.nearby_handoffs;

-- A participant (owner or payer) needs to read status/accepted-flag changes
-- on their own in-progress handoff.
drop policy if exists "nearby_handoffs_select_participant" on public.nearby_handoffs;
create policy "nearby_handoffs_select_participant"
on public.nearby_handoffs
for select
to authenticated
using ((select auth.uid()) = owner_user_id or (select auth.uid()) = payer_user_id);
