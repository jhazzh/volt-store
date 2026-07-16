-- Fixed-window rate limiting for unauthenticated actions (guest checkout).
create table public.rate_limits (
  key text primary key,
  count int not null default 1,
  window_start timestamptz not null default now()
);

-- No policies: admin client only.
alter table public.rate_limits enable row level security;

-- Atomic bump; returns whether the caller is still under the limit.
create or replace function public.bump_rate_limit(p_key text, p_window interval, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.rate_limits as r (key)
  values (p_key)
  on conflict (key) do update set
    count = case when now() - r.window_start > p_window then 1 else r.count + 1 end,
    window_start = case when now() - r.window_start > p_window then now() else r.window_start end
  returning count into v_count;
  return v_count <= p_max;
end;
$$;

revoke execute on function public.bump_rate_limit(text, interval, int) from public, anon, authenticated;
