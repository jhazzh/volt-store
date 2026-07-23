-- Complementary products ("goes well with"), as an ordered array of product ids.
-- Embeddings only find *similar* items (see 0023 related_products) — a phone's
-- nearest neighbours are other phones, never its case. Complements need world
-- knowledge, so an LLM picks them offline and we cache the result here.
-- Read on every cart view, so it's a column on products, not a join table.
alter table public.products
  add column if not exists goes_well_with uuid[] not null default '{}';

-- When pairing last ran. An empty goes_well_with is a valid result ("nothing
-- in the catalog complements this"), so emptiness can't tell us whether the
-- product was processed — this can, and it's what the backfill resumes on.
alter table public.products
  add column if not exists paired_at timestamptz;

-- Resolve a cart's product ids into their complements, already deduped and
-- with the cart's own items excluded. Doing it in SQL keeps the cart view to
-- one round trip and means the client never sees the raw id arrays.
-- security invoker + catalog is public-read (0001), so anon may call this.
create or replace function public.cart_upsells(
  cart_ids uuid[],
  match_count int default 3
)
returns setof public.products
language sql
stable
security invoker
set search_path = public
as $$
  with suggested as (
    -- unnest with ordinality: a product's own ranking is meaningful (the LLM
    -- returns best-first), so keep it as the tiebreak when several cart items
    -- suggest different things.
    select s.id, min(s.ord) as rank
    from public.products p,
         lateral unnest(p.goes_well_with) with ordinality as s(id, ord)
    where p.id = any(cart_ids)
    group by s.id
  )
  select p.*
  from public.products p
  join suggested s on s.id = p.id
  where p.id <> all(cart_ids)              -- never re-suggest what's in the cart
    and (p.stock is null or p.stock > 0)   -- digital = unlimited; skip sold out
  order by s.rank, p.name
  limit match_count;
$$;

grant execute on function public.cart_upsells(uuid[], int)
  to anon, authenticated;
