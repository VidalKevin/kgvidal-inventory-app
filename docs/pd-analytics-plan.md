# PD Analytics Plan

## Scope

PD Analytics is a new standalone report for Practitioner Depot Shopify data only.

This is not multi-store support. Do not update the existing Executive Summary page. Do not touch the existing Shopify Store #1 integration unless a shared security or routing issue absolutely requires it.

The goal is to preserve only the reporting data needed from the Practitioner Depot Shopify store from January 1, 2025 through the current date, because access to that Shopify store may only be available for a few months.

Keep the Supabase schema small. Do not store full raw Shopify JSON unless it becomes absolutely necessary for one of the required reports.

## Navigation

Main menu order:

1. Dashboard
2. Inventory
3. Fulfillment
4. Weekly Reports
5. Monthly Reports
6. PD Analytics
7. Files
8. Masters
9. Manage Users

PD Analytics should be a main menu item, not a submenu under Weekly Reports or Monthly Reports.

## Environment

Practitioner Depot Shopify credentials are separate from the existing Shopify store.

Required environment variables:

```env
SHOPIFY_PD_STORE_DOMAIN=
SHOPIFY_PD_ADMIN_ACCESS_TOKEN=
```

Use the Admin Access Token only if it is enough. Do not add API key/client secret unless the current project requires it.

## Required Reports

### Total Orders

Return the count of orders for the selected date range.

### Average Order Value

Formula:

```text
Gross Sales / Total Orders
```

### Gross Sales

Return gross sales for the selected date range.

### Product Type Filter

Allowed product types:

1. Lab Test Public
2. Nutraceutical
3. Nutraceuticals

### International Gross Sales

Definition:

```text
shipping_country is not United States, USA, or US
```

Return only:

1. International gross sales
2. Sales by shipping country, if possible

### SKU/Product Search

Allow searching by SKU or product name.

Example:

```text
Show sales for SKU XXXXX from Jan 1 to Jan 10.
```

Return:

1. Product title
2. SKU
3. Quantity sold
4. Order count
5. Gross sales

### Gift Cards

Return:

1. Total redeemed gift card value

### Vendor Gross Sales

Example:

```text
Vendor = Vidal
```

Return only:

1. Gross sales

## Page Filters

PD Analytics page filters:

1. Start date
2. End date
3. Product type
4. Vendor
5. SKU/Product search
6. International only toggle

Do not add a store filter.

## Page Layout

Top cards:

1. Gross Sales
2. Orders
3. Average Order Value
4. Gift Cards Redeemed
5. International Gross Sales
6. Vendor Gross Sales

Tables:

1. Sales by Product Type
2. Sales by Product/SKU
3. Sales by Vendor
4. International Gross Sales by Country

## Supabase Schema

### `pd_orders`

Fields:

```sql
id uuid primary key default gen_random_uuid(),
shopify_order_id text not null unique,
order_number text,
processed_at timestamptz not null,
created_at timestamptz,
updated_at timestamptz,
shipping_country text,
gross_sales numeric(12, 2) not null default 0,
gift_card_amount numeric(12, 2) not null default 0,
raw_updated_at timestamptz
```

Suggested indexes:

```sql
create index pd_orders_processed_at_idx on public.pd_orders(processed_at);
create index pd_orders_shipping_country_idx on public.pd_orders(shipping_country);
```

### `pd_order_items`

Fields:

```sql
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
```

Suggested indexes:

```sql
create index pd_order_items_processed_at_idx on public.pd_order_items(processed_at);
create index pd_order_items_sku_idx on public.pd_order_items(sku);
create index pd_order_items_product_title_idx on public.pd_order_items(product_title);
create index pd_order_items_vendor_idx on public.pd_order_items(vendor);
create index pd_order_items_product_type_idx on public.pd_order_items(product_type);
create index pd_order_items_order_id_idx on public.pd_order_items(shopify_order_id);
```

### `pd_sync_state`

Fields:

```sql
id uuid primary key default gen_random_uuid(),
sync_type text not null unique,
last_synced_at timestamptz,
last_cursor text,
status text,
message text,
updated_at timestamptz not null default now()
```

## Historical Import

Create a script to import Practitioner Depot Shopify orders from January 1, 2025 through today.

Script requirements:

1. Fetch Shopify orders.
2. Fetch line items.
3. Fetch product type and vendor for each item if the order payload does not include them.
4. Calculate and store only gross sales.
5. Calculate and store redeemed gift card amount if available.
6. Store shipping country.
7. Upsert into `pd_orders`.
8. Upsert into `pd_order_items`.
9. Avoid duplicates with Shopify order and line item IDs.
10. Handle pagination.
11. Handle Shopify API rate limits.
12. Resume if interrupted using `pd_sync_state.last_cursor`.
13. Log status, message, and progress into `pd_sync_state`.

Suggested script:

```text
scripts/sync-pd-shopify-orders.mjs
```

Historical mode:

```powershell
npm run sync:pd-orders -- --mode historical --start 2025-01-01
```

## Incremental Sync

Create a script or API endpoint that syncs new and updated Practitioner Depot orders after the historical import.

Use:

```text
updated_at_min = pd_sync_state.last_synced_at
```

Suggested command:

```powershell
npm run sync:pd-orders -- --mode incremental
```

The incremental sync must update existing rows when Shopify orders or line items change.

## API Routes

All routes should read only the PD tables and should not call the existing Shopify Store #1 code.

Routes:

1. `GET /api/pd-analytics/summary`
2. `GET /api/pd-analytics/products`
3. `GET /api/pd-analytics/vendors`
4. `GET /api/pd-analytics/countries`
5. `GET /api/pd-analytics/gift-cards`
6. `GET /api/pd-analytics/sync-status`

Each route accepts:

1. `startDate`
2. `endDate`
3. `productType`
4. `vendor`
5. `search`
6. `internationalOnly`

## Query Rules

### Date Filtering

Use `processed_at` for reporting date filters.

### Product Type Filtering

Filter `pd_order_items.product_type`.

### Vendor Filtering

Filter `pd_order_items.vendor`.

### SKU/Product Search

Search against:

1. `pd_order_items.sku`
2. `pd_order_items.product_title`

### International Only

Apply this condition to `pd_orders.shipping_country`:

```sql
coalesce(shipping_country, '') not in ('United States', 'USA', 'US')
```

Normalize casing in application code or SQL so `usa`, `United states`, and similar variants do not slip through.

## Calculation Notes

### Gross Sales

Use Shopify gross sales values where available. If calculating from line items, keep the calculation consistent across order and line item totals.

For line items, store the line-level gross sales needed for product, SKU, vendor, and product type reporting.

### Gift Card Amount

Store only the total redeemed gift card value per order in `pd_orders.gift_card_amount`.

Do not store full transaction JSON unless the gift card value cannot be reliably calculated without retaining an additional minimal field.

### Average Order Value

Calculate at query time:

```text
sum(pd_orders.gross_sales) / count(pd_orders.shopify_order_id)
```

Return `0` when total orders is `0`.

## Non-Goals

Do not:

1. Add multi-store support.
2. Add a store selector.
3. Update Executive Summary.
4. Reuse or modify the existing Shopify Store #1 sync unless absolutely required.
5. Store complete raw Shopify order JSON.
6. Store unrelated customer data.
7. Store fulfillment, inventory, or payment details beyond what is needed for the required reports.

## Implementation Order

1. Add Supabase schema for `pd_orders`, `pd_order_items`, and `pd_sync_state`.
2. Add Practitioner Depot env vars to `.env.local.example`.
3. Add historical import script.
4. Add incremental sync mode.
5. Add PD Analytics API routes.
6. Add PD Analytics main menu item and page.
7. Verify counts and gross sales against Shopify Analytics for a known date range.
8. Add scheduled incremental sync only after historical import is validated.
