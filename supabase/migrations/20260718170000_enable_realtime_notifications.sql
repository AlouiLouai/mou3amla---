-- Payment-received notifications were only ever picked up on the recipient's
-- next full page load/refresh. Supabase Realtime (Postgres Changes) delivers
-- new rows over the websocket the moment they're inserted, respecting the
-- existing notifications_select_own RLS policy automatically - no new
-- infrastructure, just enabling replication for this table.
alter publication supabase_realtime add table public.notifications;
