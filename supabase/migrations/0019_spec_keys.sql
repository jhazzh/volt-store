-- Controlled vocabulary for spec keys, so "Material" and "Materialz" can't
-- fragment the same facet. product_specs.key now references this table.

create table public.spec_keys (
  name text primary key check (char_length(name) between 1 and 60)
);

-- Seed the vocabulary from keys already in use (idempotent).
insert into public.spec_keys (name)
  select distinct key from public.product_specs
  on conflict (name) do nothing;

-- Enforce the vocabulary. New keys must be added to spec_keys first — the admin
-- action does this on save (add-new path).
alter table public.product_specs
  add constraint product_specs_key_fk
  foreign key (key) references public.spec_keys(name)
  on update cascade on delete restrict;

alter table public.spec_keys enable row level security;

create policy "spec_keys public read" on public.spec_keys
  for select using (true);

create policy "spec_keys admin write" on public.spec_keys
  for all using (public.is_admin()) with check (public.is_admin());

-- Grants come from default privileges (see 0016).
