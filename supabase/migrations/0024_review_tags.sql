-- Per-review AI aspect tags: [{ topic, sentiment }]. Extracted once on submit
-- and cached here, so we never call the LLM on a page view.
alter table public.reviews
  add column tags jsonb not null default '[]'::jsonb;
