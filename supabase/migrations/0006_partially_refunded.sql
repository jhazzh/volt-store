-- Partial refunds (e.g. total minus fee) get their own status.

alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending','paid','cancelled','refunded','partially_refunded'));
