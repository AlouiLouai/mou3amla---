-- The old constraint only stopped the *same* user from linking a
-- provider+routing_value pair twice; two different users could both link
-- the same RIB or wallet tag. A routing destination is real-world exclusive
-- (one RIB belongs to one bank account, one wallet tag to one wallet), so
-- uniqueness must be global, not per-user. A global unique index on
-- (provider_id, routing_value) subsumes the old per-user one entirely.
drop index if exists public.linked_destinations_user_provider_routing_unique;

create unique index if not exists linked_destinations_provider_routing_unique
  on public.linked_destinations (provider_id, routing_value);
