alter table public.profiles
  drop column if exists didit_latest_status,
  drop column if exists didit_session_id;
