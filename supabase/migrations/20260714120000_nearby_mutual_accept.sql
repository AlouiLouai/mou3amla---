alter table public.nearby_handoffs
  add column if not exists status text not null default 'published',
  add column if not exists payer_user_id uuid references public.profiles (id) on delete set null,
  add column if not exists owner_accepted_at timestamptz,
  add column if not exists payer_accepted_at timestamptz;

alter table public.nearby_handoffs
  drop constraint if exists nearby_handoffs_status_check;

alter table public.nearby_handoffs
  add constraint nearby_handoffs_status_check check (status in ('published', 'matched', 'confirmed'));

create index if not exists nearby_handoffs_payer_idx
  on public.nearby_handoffs (payer_user_id);
