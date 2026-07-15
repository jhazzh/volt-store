-- Refunds: webhooks flip paid → refunded after the provider confirms.

alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending','paid','cancelled','refunded'));
