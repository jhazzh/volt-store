-- Stripe Checkout: link orders to sessions; webhook flips pending → paid.

alter table public.orders
  add column stripe_session_id text unique;

-- New orders start pending until Stripe confirms payment.
alter table public.orders alter column status set default 'pending';
