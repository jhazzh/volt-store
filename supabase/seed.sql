-- Demo catalog. Images: picsum placeholders (swap for Storage uploads later).
insert into public.categories (name, slug) values
  ('Audio', 'audio'),
  ('Wearables', 'wearables'),
  ('Accessories', 'accessories');

insert into public.products (name, slug, description, price, stock, image_url, category_id)
select v.name, v.slug, v.description, v.price, v.stock, v.image_url, c.id
from (values
  ('Nimbus Headphones', 'nimbus-headphones', 'Over-ear ANC headphones with 40h battery.', 189.00, 24, 'https://picsum.photos/seed/nimbus/800/800', 'audio'),
  ('Pulse Earbuds', 'pulse-earbuds', 'True wireless earbuds, IPX5, low-latency mode.', 89.00, 60, 'https://picsum.photos/seed/pulse/800/800', 'audio'),
  ('Echo Mini Speaker', 'echo-mini-speaker', 'Pocket bluetooth speaker with punchy bass.', 49.00, 35, 'https://picsum.photos/seed/echo/800/800', 'audio'),
  ('Orbit Watch S', 'orbit-watch-s', 'AMOLED smartwatch, GPS, 7-day battery.', 249.00, 18, 'https://picsum.photos/seed/orbit/800/800', 'wearables'),
  ('Stride Band', 'stride-band', 'Slim fitness tracker with sleep insights.', 59.00, 80, 'https://picsum.photos/seed/stride/800/800', 'wearables'),
  ('Volt Charger 65W', 'volt-charger-65w', 'GaN USB-C charger, dual port.', 39.00, 100, 'https://picsum.photos/seed/volt/800/800', 'accessories'),
  ('Drift Mouse Pro', 'drift-mouse-pro', 'Ergonomic wireless mouse, 4000 DPI.', 69.00, 45, 'https://picsum.photos/seed/drift/800/800', 'accessories'),
  ('Atlas Backpack', 'atlas-backpack', 'Water-resistant 20L tech backpack.', 99.00, 22, 'https://picsum.photos/seed/atlas/800/800', 'accessories')
) as v(name, slug, description, price, stock, image_url, category_slug)
join public.categories c on c.slug = v.category_slug;
