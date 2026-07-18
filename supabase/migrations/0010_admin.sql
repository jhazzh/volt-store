-- Admin roles via a profiles table, plus admin-only write access to the catalog.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user may read their own profile (so the app can tell if they're admin).
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users that already exist.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Helper: is the current user an admin? Used by RLS policies below.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_admin
  );
$$;

-- Catalog: public read stays; only admins may write.
create policy "products admin write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

create policy "categories admin write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());
