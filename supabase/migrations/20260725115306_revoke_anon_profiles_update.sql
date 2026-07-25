-- Completes the profiles hardening: authenticated's table-wide UPDATE was
-- already revoked (20260719130000_profiles_column_grants_and_nearby_realtime.sql,
-- re-granted only for display_name), but anon's table-wide UPDATE grant was
-- never touched. Neither role has an applicable RLS policy for anon on
-- profiles (both existing policies are scoped `to authenticated`), so this
-- was already a no-op in practice - explicit revoke for the same
-- defense-in-depth reason as the rest of this audit.
revoke update on public.profiles from anon;
