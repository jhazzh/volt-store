-- Semantic product search via pgvector. Embeddings come from the `embed`
-- Edge Function (Supabase/gte-small, 384 dims).
create extension if not exists vector;

alter table public.products add column if not exists embedding vector(384);

-- Cosine-distance ANN index. Only helps once rows have embeddings.
create index if not exists products_embedding_idx on public.products
  using hnsw (embedding vector_cosine_ops);

-- Nearest products by meaning. Returns the same shape as `products` so callers
-- can reuse the Product type.
create or replace function public.match_products(
  query_embedding vector(384),
  match_threshold float default 0.5,
  match_count int default 8
)
returns setof public.products
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.products
  where embedding is not null
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Catalog is public-read (see 0001), so anon may search it.
grant execute on function public.match_products(vector, float, int)
  to anon, authenticated;
