-- Guest checkout: orders without a user, viewed via per-order access token.
alter table public.orders alter column user_id drop not null;
alter table public.orders add column access_token uuid not null default gen_random_uuid();
alter table public.orders add column email text; -- guest orders only; users join auth.users
