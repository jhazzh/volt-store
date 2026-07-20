drop function if exists public.match_products(vector, float, int);

-- Nearest products by meaning. Returns the same shape as `products` so callers
-- can reuse the Product type.
--
-- gte-small scores sit in a narrow band (~0.70-0.89 on this catalog), so an
-- absolute cutoff either passes everything or nothing. Instead keep only rows
-- within `match_margin` of the best score for THIS query — a strong match
-- returns few results, a vague one returns none.
create or replace function public.match_products(
  query_embedding vector(384),
  match_margin float default 0.05,
  match_count int default 8
)
returns setof public.products
language sql
stable
security invoker
set search_path = public
as $$
  select p.*
  from public.products p
  where p.embedding is not null
    and 1 - (p.embedding <=> query_embedding) >= (
      select max(1 - (p2.embedding <=> query_embedding)) - match_margin
      from public.products p2
      where p2.embedding is not null
    )
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

-- Catalog is public-read (see 0001), so anon may search it.
grant execute on function public.match_products(vector, float, int)
  to anon, authenticated;
