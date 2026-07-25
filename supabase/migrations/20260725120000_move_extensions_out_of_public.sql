-- Supabase security advisor (extension_in_public, WARN): citext and pg_trgm
-- were installed in the public schema instead of the dedicated `extensions`
-- schema Supabase provisions for exactly this. Safe to move without touching
-- any dependent object (profiles.username's citext type, the
-- profiles_username_trgm_idx trigram index): the database's default
-- search_path is already `"$user", public, extensions` (confirmed before
-- running this), so every existing type/operator/index reference continues
-- to resolve with no application-code or column-definition changes needed.
alter extension citext set schema extensions;
alter extension pg_trgm set schema extensions;
