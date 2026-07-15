-- The previous accept flow read the row, decided in application code whether
-- "the other side" had already accepted, then wrote that decision back. Two
-- concurrent accepts (owner and payer tapping "Accept" within the same
-- instant, which the UI actively encourages via a synchronized vibration)
-- would both read the row before either write landed, both conclude the
-- other side hadn't accepted yet, and both write accepted_at without ever
-- flipping status to 'confirmed' - a permanently stuck match. Doing the
-- read-and-decide inside a single UPDATE statement instead means Postgres's
-- row-level locking serializes the two concurrent accepts: whichever commits
-- second sees the first one's already-committed accepted_at column.
create or replace function public.accept_nearby_handoff(p_id uuid, p_role text)
returns public.nearby_handoffs
language plpgsql
security invoker
set search_path = public
as $$
declare
  result public.nearby_handoffs;
begin
  if p_role not in ('owner', 'payer') then
    raise exception 'invalid role: %', p_role;
  end if;

  update public.nearby_handoffs h
  set
    owner_accepted_at = case when p_role = 'owner' then timezone('utc', now()) else h.owner_accepted_at end,
    payer_accepted_at = case when p_role = 'payer' then timezone('utc', now()) else h.payer_accepted_at end,
    status = case
      when h.status = 'confirmed' then 'confirmed'
      when (p_role = 'owner' and h.payer_accepted_at is not null)
        or (p_role = 'payer' and h.owner_accepted_at is not null)
      then 'confirmed'
      else h.status
    end
  where h.id = p_id
  returning h.* into result;

  return result;
end;
$$;
