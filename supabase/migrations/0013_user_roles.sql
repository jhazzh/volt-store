-- Rename profiles -> user_roles; store a row ONLY for users who have a role.
-- No row = normal buyer. Admins get a row via make:admin / the admin UI.

-- Stop auto-creating a row on signup.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

alter table public.profiles rename to user_roles;

-- Only rows that actually grant a role should exist.
delete from public.user_roles where role_id is null;
alter table public.user_roles alter column role_id set not null;

-- Rename the self-read policy to match the table.
alter policy "profiles self read" on public.user_roles rename to "user_roles self read";

-- Redefine the admin check against the renamed table.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.id = auth.uid() and r.name = 'admin'
  );
$$;
