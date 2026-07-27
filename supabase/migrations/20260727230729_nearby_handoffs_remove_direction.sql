-- Removing sender-as-host (host_pays) entirely per product decision - Send
-- keeps "Nearby match" (connect/claim a receiver's code), Receive keeps
-- hosting a code. `amount`/`amount_source` (Phase 1) stay - they're
-- independent of direction and still apply to the one remaining flow.
alter table public.nearby_handoffs
  drop constraint if exists nearby_handoffs_direction_check;

alter table public.nearby_handoffs
  drop column if exists direction;
