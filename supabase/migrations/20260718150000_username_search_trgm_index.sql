-- /api/users/search does `username.ilike.'query%'` for the send screen's
-- recipient typeahead. The existing unique index on `username` (citext)
-- only accelerates exact-match/uniqueness checks; a locale-aware collation
-- means it can't be used for pattern matching, so an ILIKE prefix search
-- degrades to a sequential scan as the profiles table grows past a
-- thousand-or-so rows.
--
-- A trigram GIN index is the standard, collation-proof fix for LIKE/ILIKE
-- search at any table size - but it must be built on an explicit `::text`
-- cast of the citext column, not the bare column. Verified via EXPLAIN:
-- `gin (username gin_trgm_ops)` is never chosen by the planner for a citext
-- column's `~~*` operator, while `gin ((username::text) gin_trgm_ops)` is
-- (Bitmap Index Scan) - but only when the query also casts
-- (`username::text ilike ...`), which is why the route was updated to use
-- `.filter("username::text", "ilike", ...)` instead of `.ilike("username", ...)`.
create extension if not exists pg_trgm;

drop index if exists public.profiles_username_trgm_idx;

create index if not exists profiles_username_trgm_idx
  on public.profiles using gin ((username::text) gin_trgm_ops);
