-- Replace profiles.is_admin with a proper roles table (one role per user).

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

insert into public.roles (name) values ('admin');

alter table public.roles enable row level security;
create policy "roles public read" on public.roles for select using (true);

-- Each profile references at most one role.
alter table public.profiles
  add column role_id uuid references public.roles(id) on delete set null;

-- Carry over existing admins, then drop the boolean flag.
update public.profiles p
  set role_id = (select id from public.roles where name = 'admin')
  where p.is_admin;

alter table public.profiles drop column is_admin;

-- Redefine the helper to check the admin role. RLS + requireAdmin() unchanged.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid() and r.name = 'admin'
  );
$$;
