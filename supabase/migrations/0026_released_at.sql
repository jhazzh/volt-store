-- Real release date, distinct from created_at (row insert time). Powers the
-- "newest" sort and the quiz's "Latest and greatest" option. Backfill existing
-- rows to created_at so the column is never null; the seed sets varied dates.
alter table public.products
  add column released_at timestamptz not null default now();

update public.products set released_at = created_at;

-- Sort/browse by recency hits this a lot.
create index products_released_at_idx on public.products (released_at desc);
