-- Supabase default privileges can grant ALL before the initial SELECT grant.
-- RLS still gates published reads; public clients must not inherit write/DDL privileges.
begin;
revoke all privileges on table public.podcasts from anon, authenticated;
grant select on table public.podcasts to anon, authenticated;
commit;
