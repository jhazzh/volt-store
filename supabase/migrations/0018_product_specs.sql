-- Dynamic per-product specs (Material → Aluminum, Weight → 200g, …).
-- Separate table (not jsonb) so specs can be filtered and facet-counted by key.

create table public.product_specs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  key text not null check (char_length(key) between 1 and 60),
  value text not null check (char_length(value) between 1 and 200),
  -- Display order within a product; admin controls it.
  position int not null default 0
);

-- Filtering + facet counts query by (key, value).
create index product_specs_key_value_idx on public.product_specs (key, value);
-- Ordered display for one product.
create index product_specs_product_idx on public.product_specs (product_id, position);

alter table public.product_specs enable row level security;

-- Anyone can read specs (part of the public catalog).
create policy "product_specs public read" on public.product_specs
  for select using (true);

-- Only admins may write, matching the products catalog policy.
create policy "product_specs admin write" on public.product_specs
  for all using (public.is_admin()) with check (public.is_admin());

-- Table grants come from default privileges (see 0016); no explicit grant here.
