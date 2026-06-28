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

create index if not exists pd_order_returns_refund_created_at_idx
on public.pd_order_returns(refund_created_at);

create index if not exists pd_order_returns_order_id_idx
on public.pd_order_returns(shopify_order_id);

create index if not exists pd_order_returns_sku_idx
on public.pd_order_returns(sku);

alter table public.pd_order_returns enable row level security;

drop policy if exists "Service role can manage pd order returns"
on public.pd_order_returns;

create policy "Service role can manage pd order returns"
on public.pd_order_returns
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

notify pgrst, 'reload schema';
