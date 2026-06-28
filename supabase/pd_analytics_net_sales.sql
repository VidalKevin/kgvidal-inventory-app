alter table public.pd_orders
add column if not exists net_sales numeric(12, 2) not null default 0;
