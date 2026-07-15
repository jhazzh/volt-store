-- Xendit checkout: link orders to invoices (webhook/return flips pending → paid).

alter table public.orders
  add column xendit_invoice_id text unique;
