-- Supabase's own experimental native-passkey feature
-- (registerPasskey()/signInWithPasskey()) verifies with `AuthApiError:
-- Credential verification failed` even with a correctly configured Relying
-- Party (confirmed against the Dashboard settings) - a bug/limitation in
-- that experimental feature, not something fixable from application code.
-- Replaced with a self-hosted WebAuthn implementation (@simplewebauthn/server)
-- that stores its own credentials here instead of relying on
-- auth.webauthn_credentials.
create table if not exists public.passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports text[],
  device_type text,
  backed_up boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  last_used_at timestamptz
);

create index if not exists passkeys_user_id_idx on public.passkeys (user_id);

alter table public.passkeys enable row level security;

drop policy if exists "passkeys_select_own" on public.passkeys;
create policy "passkeys_select_own"
on public.passkeys
for select
to authenticated
using ((select auth.uid()) = user_id);

-- No insert/update/delete policies: registration and authentication
-- verification are server-only (service-role admin client), never
-- reachable from the browser directly.
