-- Add product_type so catalog can hold physical ('simple') and digital goods.

alter table public.products
  add column product_type text not null default 'simple'
    check (product_type in ('simple','digital')),
  -- How a digital good is delivered; null for simple products.
  add column delivery_type text
    check (delivery_type in ('file','key','access','url')),
  -- The delivered value: bucket path (file), code (key/access), or link (url).
  add column delivery_value text;

-- Digital goods have unlimited copies, so stock is no longer required.
alter table public.products alter column stock drop not null;

-- Digital products must declare how they're delivered.
alter table public.products add constraint products_digital_delivery_chk
  check (product_type <> 'digital' or delivery_type is not null);
