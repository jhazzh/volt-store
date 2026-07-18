-- Drop the unused 'buyer' role; only 'admin' is a real role (no role = buyer).
delete from public.roles where name = 'buyer';
