-- Nearest catalog items to a given product by embedding similarity, excluding
-- the product itself. Cross-category on purpose: pure semantic "more like this".
-- Returns the same shape as `products` so callers reuse the Product type.
create or replace function public.related_products(
  source_id uuid,
  match_count int default 4
)
returns setof public.products
language sql
stable
security invoker
set search_path = public
as $$
  select p.*
  from public.products p,
       (select embedding from public.products where id = source_id) src
  where p.id <> source_id
    and p.embedding is not null
    and src.embedding is not null
  order by p.embedding <=> src.embedding
  limit match_count;
$$;

-- Catalog is public-read (see 0001), so anon may fetch related items.
grant execute on function public.related_products(uuid, int)
  to anon, authenticated;
