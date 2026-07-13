-- Catalog + orders schema with RLS.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  image_url text,
  category_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_slug_idx on public.products (slug);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  total numeric(10,2) not null check (total >= 0),
  status text not null default 'paid' check (status in ('pending','paid','cancelled')),
  created_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  qty int not null check (qty > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- RLS: catalog public read-only; orders owner-only.
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "categories public read" on public.categories
  for select using (true);

create policy "products public read" on public.products
  for select using (true);

create policy "orders owner select" on public.orders
  for select using (auth.uid() = user_id);
create policy "orders owner insert" on public.orders
  for insert with check (auth.uid() = user_id);

create policy "order_items owner select" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
create policy "order_items owner insert" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
