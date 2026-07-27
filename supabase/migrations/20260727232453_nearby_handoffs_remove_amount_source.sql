-- amount_source only ever existed to distinguish a host-set amount from a
-- guest-set one, for cancel's "clear a guest-set amount, keep a host-set
-- one" logic. The guest-sets-amount-inline flow (a redundant duplicate of
-- generate-intent-screen's own amount entry) is now removed entirely, so
-- amount_source can only ever be 'host' or null - fully derivable from
-- `amount is null` and no longer distinguishing anything.
alter table public.nearby_handoffs
  drop constraint if exists nearby_handoffs_amount_source_consistency;

alter table public.nearby_handoffs
  drop constraint if exists nearby_handoffs_amount_source_check;

alter table public.nearby_handoffs
  drop column if exists amount_source;
