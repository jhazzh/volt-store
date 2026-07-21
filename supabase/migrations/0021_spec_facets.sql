-- Facet counts for the catalog filter sidebar: how many products carry each
-- (key, value) spec. Only enum/text keys with real usage show up.

create or replace function public.spec_facets()
returns table (key text, value text, count bigint)
language sql
stable
as $$
  select ps.key, ps.value, count(distinct ps.product_id)
  from public.product_specs ps
  group by ps.key, ps.value
  order by ps.key, ps.value;
$$;

grant execute on function public.spec_facets() to anon, authenticated, service_role;
