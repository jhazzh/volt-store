-- Typed spec keys: a key declares how its value behaves. Enum keys draw their
-- allowed options from spec_key_values, so the value field is a dropdown too.

alter table public.spec_keys
  add column type text not null default 'text'
    check (type in ('text', 'number', 'boolean', 'enum'));

-- Allowed options for enum-typed keys. One row per option.
create table public.spec_key_values (
  key text not null references public.spec_keys(name)
    on update cascade on delete cascade,
  value text not null check (char_length(value) between 1 and 200),
  position int not null default 0,
  primary key (key, value)
);

alter table public.spec_key_values enable row level security;

create policy "spec_key_values public read" on public.spec_key_values
  for select using (true);

create policy "spec_key_values admin write" on public.spec_key_values
  for all using (public.is_admin()) with check (public.is_admin());

-- Grants come from default privileges (see 0016).
