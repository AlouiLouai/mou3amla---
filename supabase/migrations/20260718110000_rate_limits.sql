create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default timezone('utc', now())
);

alter table public.rate_limits enable row level security;

-- No policies: only the service-role client (which bypasses RLS) and the
-- security-definer function below ever touch this table. Anon/authenticated
-- roles get nothing, by default.

create or replace function public.check_rate_limit(
  p_key text,
  p_max_count integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 1, timezone('utc', now()))
  on conflict (key) do update
  set
    count = case
      when public.rate_limits.window_start < timezone('utc', now()) - (p_window_seconds || ' seconds')::interval
        then 1
      else public.rate_limits.count + 1
    end,
    window_start = case
      when public.rate_limits.window_start < timezone('utc', now()) - (p_window_seconds || ' seconds')::interval
        then timezone('utc', now())
      else public.rate_limits.window_start
    end
  returning count into v_count;

  return v_count <= p_max_count;
end;
$$;
