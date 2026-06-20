create table if not exists public.shiphero_onhold_orders (
  id bigint generated always as identity primary key,
  order_date date,
  order_number text,
  first_name text,
  email text,
  on_hold text,
  synced_at timestamptz not null default now()
);

create index if not exists shiphero_onhold_orders_order_date_idx
on public.shiphero_onhold_orders (order_date desc);

create index if not exists shiphero_onhold_orders_synced_at_idx
on public.shiphero_onhold_orders (synced_at desc);

alter table public.shiphero_onhold_orders enable row level security;
