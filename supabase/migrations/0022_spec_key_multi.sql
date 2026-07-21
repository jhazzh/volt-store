-- Add 'multiselect': an enum-like key that holds multiple values per product
-- (e.g. Color: Black + White). Options still live in spec_key_values.

-- Drop the existing type check by its actual name (auto-named by Postgres),
-- then re-add it with the extra value.
do $$
declare
  con text;
begin
  select conname into con
  from pg_constraint
  where conrelid = 'public.spec_keys'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%type%';
  if con is not null then
    execute format('alter table public.spec_keys drop constraint %I', con);
  end if;
end $$;

alter table public.spec_keys
  add constraint spec_keys_type_check
  check (type in ('text', 'number', 'boolean', 'enum', 'multiselect'));
