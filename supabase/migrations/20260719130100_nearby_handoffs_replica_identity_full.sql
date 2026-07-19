-- Realtime DELETE events only carry the old row's columns that are part of
-- the table's replica identity - the default ('d', primary key only) means a
-- DELETE's old-row image has just `id`, which is not enough for Realtime to
-- evaluate the owner_user_id/payer_user_id RLS filter added by
-- nearby_handoffs_select_participant, so cancel (delete) events would
-- silently never reach either participant. FULL includes every column in
-- both UPDATE and DELETE old-row images so that filter can actually
-- evaluate. Table is small and low-write-volume, so the extra WAL cost is
-- negligible.
alter table public.nearby_handoffs replica identity full;
