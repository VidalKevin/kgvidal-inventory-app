create extension if not exists pgcrypto;

create table if not exists public.pd_orders (
  id uuid primary key default gen_random_uuid(),
  shopify_order_id text not null unique,
  order_number text,
  processed_at timestamptz not null,
  created_at timestamptz,
  updated_at timestamptz,
  shipping_country text,
  gross_sales numeric(12, 2) not null default 0,
  net_sales numeric(12, 2) not null default 0,
  gift_card_amount numeric(12, 2) not null default 0,
  raw_updated_at timestamptz
);

create table if not exists public.pd_order_items (
  id uuid primary key default gen_random_uuid(),
  shopify_order_id text not null,
  shopify_line_item_id text not null unique,
  processed_at timestamptz not null,
  sku text,
  product_title text,
  vendor text,
  product_type text,
  quantity integer not null default 0,
  gross_sales numeric(12, 2) not null default 0
);

create table if not exists public.pd_order_returns (
  id uuid primary key default gen_random_uuid(),
  shopify_order_id text not null,
  order_number text,
  shopify_refund_id text not null,
  shopify_refund_line_item_id text not null unique,
  refund_created_at timestamptz not null,
  sku text,
  product_title text,
  quantity integer not null default 0,
  return_amount numeric(12, 2) not null default 0
);

create table if not exists public.pd_sync_state (
  id uuid primary key default gen_random_uuid(),
  sync_type text not null unique,
  last_synced_at timestamptz,
  last_cursor text,
  status text,
  message text,
  updated_at timestamptz not null default now()
);

create index if not exists pd_orders_processed_at_idx on public.pd_orders(processed_at);
create index if not exists pd_orders_shipping_country_idx on public.pd_orders(shipping_country);

alter table public.pd_orders
add column if not exists net_sales numeric(12, 2) not null default 0;

create index if not exists pd_order_items_processed_at_idx on public.pd_order_items(processed_at);
create index if not exists pd_order_items_sku_idx on public.pd_order_items(sku);
create index if not exists pd_order_items_product_title_idx on public.pd_order_items(product_title);
create index if not exists pd_order_items_vendor_idx on public.pd_order_items(vendor);
create index if not exists pd_order_items_product_type_idx on public.pd_order_items(product_type);
create index if not exists pd_order_items_order_id_idx on public.pd_order_items(shopify_order_id);
create index if not exists pd_order_returns_refund_created_at_idx on public.pd_order_returns(refund_created_at);
create index if not exists pd_order_returns_order_id_idx on public.pd_order_returns(shopify_order_id);
create index if not exists pd_order_returns_sku_idx on public.pd_order_returns(sku);

alter table public.pd_orders enable row level security;
alter table public.pd_order_items enable row level security;
alter table public.pd_order_returns enable row level security;
alter table public.pd_sync_state enable row level security;

drop policy if exists "Service role can manage pd orders" on public.pd_orders;
create policy "Service role can manage pd orders"
on public.pd_orders
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage pd order items" on public.pd_order_items;
create policy "Service role can manage pd order items"
on public.pd_order_items
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage pd order returns" on public.pd_order_returns;
create policy "Service role can manage pd order returns"
on public.pd_order_returns
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage pd sync state" on public.pd_sync_state;
create policy "Service role can manage pd sync state"
on public.pd_sync_state
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
