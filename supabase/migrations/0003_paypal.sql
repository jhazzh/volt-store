-- PayPal checkout: link orders to PayPal order ids (capture flips pending → paid).

alter table public.orders
  add column paypal_order_id text unique;
