create table if not exists public.nearby_handoffs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  signed_token text not null,
  challenge_code text not null check (challenge_code ~ '^\d{3}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists nearby_handoffs_owner_created_idx
  on public.nearby_handoffs (owner_user_id, created_at desc);

create index if not exists nearby_handoffs_code_expires_idx
  on public.nearby_handoffs (challenge_code, expires_at desc);

create unique index if not exists nearby_handoffs_challenge_code_unique
  on public.nearby_handoffs (challenge_code);

create unique index if not exists nearby_handoffs_owner_unique
  on public.nearby_handoffs (owner_user_id);

alter table public.nearby_handoffs enable row level security;
