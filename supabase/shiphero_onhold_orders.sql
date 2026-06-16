create table if not exists public.shiphero_onhold_orders (
  id bigint generated always as identity primary key,
  order_date date,
  order_number text,
  first_name text,
  email text,
  on_hold text,
  synced_at timestamptz default now()
);

alter table public.shiphero_onhold_orders enable row level security;
