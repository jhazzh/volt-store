-- Table-level grants for the Supabase roles.
--
-- RLS decides WHICH ROWS a role may touch; grants decide whether it may touch
-- the table at all. Every earlier migration wrote policies but no grants, so a
-- database built purely from `supabase db reset` denies every app query with
-- "permission denied for table ...". Hosted projects don't show this because
-- tables made through the dashboard inherit grants from default privileges.
--
-- Role → client map:
--   anon / authenticated ← publishable key (server.ts, client.ts)
--   service_role         ← secret key (admin.ts), bypasses RLS
--
-- Idempotent, and a no-op where the grants already exist.

grant usage on schema public to anon, authenticated, service_role;

-- Anonymous visitors read the catalog only. Guest checkout does NOT insert as
-- anon — it routes through the admin client (see checkout/actions.ts).
grant select on all tables in schema public to anon;

-- Signed-in users need full DML: their RLS policies are what narrow it to
-- their own rows (orders, profiles) or to admins (products, categories).
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Server-side only: webhooks and embedding writes run with no session for RLS
-- to check against. Never exposed to the browser (admin.ts is `server-only`).
grant all on all tables in schema public to service_role;

-- bump_rate_limit never granted EXECUTE (match_products and is_admin did, in
-- 0015 and 0010). Without it the limiter fails closed and every search and
-- checkout returns "Too many requests". Only the admin client calls it.
grant execute on function public.bump_rate_limit(text, interval, int)
  to service_role;

-- Keep future tables working without another grants migration.
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
