-- Product reviews + cached AI summary on the product row.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  -- One review per user per product; editing updates the same row.
  unique (product_id, user_id)
);
create index reviews_product_idx on public.reviews (product_id, created_at desc);

-- Cached LLM summary. Regenerated when review_count crosses a threshold,
-- so we call LLM once per N reviews, not once per page view.
alter table public.products
  add column review_summary text,
  add column review_summary_count int not null default 0;

alter table public.reviews enable row level security;

-- Anyone can read reviews.
create policy "reviews public read" on public.reviews
  for select using (true);

-- Only verified purchasers can write, and only for themselves. Matches the
-- order_items ownership pattern used elsewhere.
create policy "reviews verified insert" on public.reviews
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = reviews.product_id
        and o.user_id = auth.uid()
        and o.status = 'paid'
    )
  );

create policy "reviews owner update" on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reviews owner delete" on public.reviews
  for delete using (auth.uid() = user_id);

-- Rating aggregates in one round-trip for the product page.
create or replace function public.review_stats(p_product_id uuid)
returns table (count bigint, average numeric)
language sql
stable
as $$
  select count(*), round(avg(rating), 2)
  from public.reviews
  where product_id = p_product_id;
$$;

-- Default privileges cover the reviews table; functions need explicit grants.
grant execute on function public.review_stats(uuid)
  to anon, authenticated, service_role;
