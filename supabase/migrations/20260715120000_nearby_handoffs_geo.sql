alter table public.nearby_handoffs
  add column if not exists geo_lat double precision,
  add column if not exists geo_lng double precision;

comment on column public.nearby_handoffs.geo_lat is
  'Coarse latitude (rounded client- and server-side to ~100m precision) used only to bound nearby-code discovery to plausible physical proximity. Never stores precise/raw device coordinates.';
comment on column public.nearby_handoffs.geo_lng is
  'Coarse longitude, see geo_lat.';

create index if not exists nearby_handoffs_geo_idx
  on public.nearby_handoffs (geo_lat, geo_lng)
  where status = 'published';
