-- Replaces findAuthUser's O(n) linear scan through
-- admin.auth.admin.listUsers() (capped at 5 pages x 200 = 1000 users) with
-- an O(1) indexed lookup against auth.users' own unique email/phone
-- columns. That scan only ever runs on a rare race-condition recovery path
-- in createIdentity (src/features/auth/server/actions.ts) - a prior
-- registration attempt created the Supabase Auth user but crashed before
-- the public.profiles row landed - but past ~1000 total Supabase Auth
-- users, it could silently stop finding the colliding user beyond page 5
-- and ask a real user to "retry once" instead of ever actually recovering.
create or replace function public.find_auth_user_id(target_email text, target_phone text)
returns table (id uuid, phone text, email text, raw_user_meta_data jsonb)
language sql
stable
security definer
set search_path = auth, public
as $$
  select au.id, au.phone, au.email, au.raw_user_meta_data
  from auth.users au
  where au.email = target_email
     or ('+' || regexp_replace(coalesce(au.phone, ''), '^\+', '')) = target_phone
  limit 1;
$$;

-- Only the service-role admin client (never the browser anon/authenticated
-- key) may call this - it reads auth.users directly, bypassing RLS on
-- purpose for backend-only identity recovery during registration.
revoke all on function public.find_auth_user_id(text, text) from public, anon, authenticated;
grant execute on function public.find_auth_user_id(text, text) to service_role;
