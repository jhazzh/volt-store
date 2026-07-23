-- Personalized picks: average the embeddings of everything the user has bought
-- into one "taste" vector, then return the nearest catalog products they have
-- not already ordered. No LLM call — reuses the product embeddings.
-- security invoker: runs under the caller, so orders RLS (owner-only) applies
-- and one user can never derive picks from another's history.
create or replace function public.picked_for_you(
  p_user_id uuid,
  match_count int default 4
)
returns setof public.products
language sql
stable
security invoker
set search_path = public
as $$
  with bought as (
    select distinct oi.product_id
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.user_id = p_user_id
      and o.status = 'paid'
  ),
  taste as (
    select avg(p.embedding)::vector(384) as v
    from public.products p
    join bought b on b.product_id = p.id
    where p.embedding is not null
  )
  select p.*
  from public.products p, taste t
  where t.v is not null
    and p.embedding is not null
    and p.id not in (select product_id from bought)
  order by p.embedding <=> t.v
  limit match_count;
$$;

grant execute on function public.picked_for_you(uuid, int)
  to authenticated;
