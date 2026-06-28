import type { SupabaseClient } from "@supabase/supabase-js";

export type PdFilters = {
  startDate: string;
  endDate: string;
  productType?: string;
  vendor?: string;
  search?: string;
  internationalOnly?: boolean;
};

export type PdOrderRow = {
  shopify_order_id: string;
  order_number: string | null;
  processed_at: string;
  shipping_country: string | null;
  gross_sales: number | string | null;
  net_sales: number | string | null;
  gift_card_amount: number | string | null;
};

export type PdOrderItemRow = {
  shopify_order_id: string;
  shopify_line_item_id: string;
  processed_at: string;
  sku: string | null;
  product_title: string | null;
  vendor: string | null;
  product_type: string | null;
  quantity: number | null;
  gross_sales: number | string | null;
};

export type PdOrderReturnRow = {
  shopify_order_id: string;
  refund_created_at: string;
  sku: string | null;
  product_title: string | null;
  quantity: number | null;
  return_amount: number | string | null;
};

export type PdOrderWithItems = PdOrderRow & {
  items: PdOrderItemRow[];
};

const PAGE_SIZE = 1000;
const US_COUNTRIES = new Set(["united states", "usa", "us"]);

export function parsePdFilters(url: URL): PdFilters {
  const endDate = parseDateInput(url.searchParams.get("endDate")) ?? todayInput();
  const startDate =
    parseDateInput(url.searchParams.get("startDate")) ?? firstDayOfMonth(endDate);

  return {
    startDate,
    endDate,
    productType: cleanParam(url.searchParams.get("productType")),
    vendor: cleanParam(url.searchParams.get("vendor")),
    search: cleanParam(url.searchParams.get("search")),
    internationalOnly: url.searchParams.get("internationalOnly") === "true",
  };
}

export function validatePdFilters(filters: PdFilters) {
  if (filters.startDate > filters.endDate) {
    throw new Error("Start date must be before end date.");
  }
}

export function numericValue(value: number | string | null | undefined) {
  return Number(value ?? 0) || 0;
}

export function isInternationalCountry(country: string | null | undefined) {
  const normalized = country?.trim().toLowerCase();
  return normalized ? !US_COUNTRIES.has(normalized) : false;
}

export function normalizeDateEnd(dateValue: string) {
  return `${dateValue}T23:59:59.999Z`;
}

export function normalizeDateStart(dateValue: string) {
  return `${dateValue}T00:00:00.000Z`;
}

export async function loadPdData(
  supabase: SupabaseClient,
  filters: PdFilters
): Promise<PdOrderWithItems[]> {
  validatePdFilters(filters);

  let ordersQuery = supabase
    .from("pd_orders")
    .select(
      "shopify_order_id,order_number,processed_at,shipping_country,gross_sales,net_sales,gift_card_amount"
    )
    .gte("processed_at", normalizeDateStart(filters.startDate))
    .lte("processed_at", normalizeDateEnd(filters.endDate))
    .order("processed_at", { ascending: false });

  if (filters.internationalOnly) {
    ordersQuery = ordersQuery.not("shipping_country", "is", null);
  }

  const orders = await fetchAll<PdOrderRow>(ordersQuery);
  const filteredOrders = filters.internationalOnly
    ? orders.filter((order) => isInternationalCountry(order.shipping_country))
    : orders;

  if (filteredOrders.length === 0) {
    return [];
  }

  const orderIds = filteredOrders.map((order) => order.shopify_order_id);
  const items: PdOrderItemRow[] = [];

  for (const chunk of chunkArray(orderIds, 300)) {
    let itemQuery = supabase
      .from("pd_order_items")
      .select(
        "shopify_order_id,shopify_line_item_id,processed_at,sku,product_title,vendor,product_type,quantity,gross_sales"
      )
      .in("shopify_order_id", chunk);

    if (filters.productType) {
      itemQuery = itemQuery.eq("product_type", filters.productType);
    }

    if (filters.vendor) {
      itemQuery = itemQuery.eq("vendor", filters.vendor);
    }

    const chunkItems = await fetchAll<PdOrderItemRow>(itemQuery);
    items.push(...chunkItems);
  }

  const search = filters.search?.trim().toLowerCase();
  const filteredItems = search
    ? items.filter((item) => {
        const sku = item.sku?.toLowerCase() ?? "";
        const title = item.product_title?.toLowerCase() ?? "";
        return sku.includes(search) || title.includes(search);
      })
    : items;

  const itemsByOrder = new Map<string, PdOrderItemRow[]>();

  for (const item of filteredItems) {
    const current = itemsByOrder.get(item.shopify_order_id) ?? [];
    current.push(item);
    itemsByOrder.set(item.shopify_order_id, current);
  }

  const itemFiltersApplied = Boolean(
    filters.productType || filters.vendor || filters.search
  );

  return filteredOrders
    .map((order) => ({
      ...order,
      items: itemsByOrder.get(order.shopify_order_id) ?? [],
    }))
    .filter((order) => !itemFiltersApplied || order.items.length > 0);
}

export async function loadPdReturns(
  supabase: SupabaseClient,
  filters: PdFilters
): Promise<PdOrderReturnRow[]> {
  validatePdFilters(filters);

  const returnsQuery = supabase
    .from("pd_order_returns")
    .select(
      "shopify_order_id,refund_created_at,sku,product_title,quantity,return_amount"
    )
    .gte("refund_created_at", normalizeDateStart(filters.startDate))
    .lte("refund_created_at", normalizeDateEnd(filters.endDate));

  let returns: PdOrderReturnRow[];

  try {
    returns = await fetchAll<PdOrderReturnRow>(returnsQuery);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("pd_order_returns")) {
      return [];
    }

    throw error;
  }

  const search = filters.search?.trim().toLowerCase();

  return search
    ? returns.filter((row) => {
        const sku = row.sku?.toLowerCase() ?? "";
        const title = row.product_title?.toLowerCase() ?? "";
        return sku.includes(search) || title.includes(search);
      })
    : returns;
}

export function summarizePdData(
  orders: PdOrderWithItems[],
  returns: PdOrderReturnRow[] = []
) {
  let grossSales = 0;
  let discountAdjustedSales = 0;
  let giftCardsRedeemed = 0;
  let internationalGrossSales = 0;
  let vidalGrossSales = 0;
  const returnsAmount = returns.reduce(
    (total, row) => total + numericValue(row.return_amount),
    0
  );

  for (const order of orders) {
    const filteredItemGross = order.items.reduce(
      (total, item) => total + numericValue(item.gross_sales),
      0
    );
    const orderGross =
      order.items.length > 0 ? filteredItemGross : numericValue(order.gross_sales);

    grossSales += orderGross;
    discountAdjustedSales += numericValue(order.net_sales);
    giftCardsRedeemed += numericValue(order.gift_card_amount);

    if (isInternationalCountry(order.shipping_country)) {
      internationalGrossSales += orderGross;
    }

    vidalGrossSales += order.items.reduce((total, item) => {
      return item.vendor?.trim().toLowerCase() === "vidal"
        ? total + numericValue(item.gross_sales)
        : total;
    }, 0);
  }

  const totalOrders = orders.length;
  const netSales = Math.max(discountAdjustedSales - returnsAmount, 0);

  return {
    grossSales,
    netSales,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? netSales / totalOrders : 0,
    giftCardsRedeemed,
    internationalGrossSales,
    vidalGrossSales,
    vendorGrossSales: vidalGrossSales,
  };
}

export function salesByProductType(orders: PdOrderWithItems[]) {
  const grouped = new Map<string, { productType: string; grossSales: number }>();

  for (const order of orders) {
    for (const item of order.items) {
      const productType = item.product_type || "Unassigned";
      const current = grouped.get(productType) ?? { productType, grossSales: 0 };
      current.grossSales += numericValue(item.gross_sales);
      grouped.set(productType, current);
    }
  }

  return sortByGrossSales([...grouped.values()]);
}

export function salesByProduct(orders: PdOrderWithItems[]) {
  const grouped = new Map<
    string,
    {
      productTitle: string;
      sku: string;
      vendor: string;
      quantitySold: number;
      orderCount: number;
      grossSales: number;
      orderIds: Set<string>;
    }
  >();

  for (const order of orders) {
    for (const item of order.items) {
      const sku = item.sku || "";
      const productTitle = item.product_title || "Unassigned";
      const vendor = item.vendor || "";
      const key = `${sku}::${productTitle}::${vendor}`;
      const current =
        grouped.get(key) ??
        {
          productTitle,
          sku,
          vendor,
          quantitySold: 0,
          orderCount: 0,
          grossSales: 0,
          orderIds: new Set<string>(),
        };

      current.quantitySold += Number(item.quantity ?? 0);
      current.grossSales += numericValue(item.gross_sales);
      current.orderIds.add(order.shopify_order_id);
      current.orderCount = current.orderIds.size;
      grouped.set(key, current);
    }
  }

  return sortByGrossSales(
    [...grouped.values()].map((row) => ({
      productTitle: row.productTitle,
      sku: row.sku,
      vendor: row.vendor,
      quantitySold: row.quantitySold,
      orderCount: row.orderCount,
      grossSales: row.grossSales,
    }))
  );
}

export function salesByVendor(orders: PdOrderWithItems[]) {
  const grouped = new Map<string, { vendor: string; grossSales: number }>();

  for (const order of orders) {
    for (const item of order.items) {
      const vendor = item.vendor || "Unassigned";
      const current = grouped.get(vendor) ?? { vendor, grossSales: 0 };
      current.grossSales += numericValue(item.gross_sales);
      grouped.set(vendor, current);
    }
  }

  return sortByGrossSales([...grouped.values()]);
}

export function salesByCountry(orders: PdOrderWithItems[]) {
  const grouped = new Map<
    string,
    { shippingCountry: string; grossSales: number; orderCount: number }
  >();

  for (const order of orders) {
    if (!isInternationalCountry(order.shipping_country)) {
      continue;
    }

    const shippingCountry = order.shipping_country || "Unassigned";
    const current =
      grouped.get(shippingCountry) ?? {
        shippingCountry,
        grossSales: 0,
        orderCount: 0,
      };
    const itemGross = order.items.reduce(
      (total, item) => total + numericValue(item.gross_sales),
      0
    );

    current.grossSales +=
      order.items.length > 0 ? itemGross : numericValue(order.gross_sales);
    current.orderCount += 1;
    grouped.set(shippingCountry, current);
  }

  return sortByGrossSales([...grouped.values()]);
}

export async function distinctPdValues(
  supabase: SupabaseClient,
  column: "vendor" | "product_type"
) {
  const rows = await fetchAll<Record<string, string | null>>(
    supabase.from("pd_order_items").select(column).not(column, "is", null).order(column)
  );
  return [...new Set(rows.map((row) => row[column]).filter(Boolean))] as string[];
}

export async function getPdSyncState(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("pd_sync_state")
    .select("sync_type,last_synced_at,last_cursor,status,message,updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchAll<T>(
  query: {
    range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
  }
) {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(...(data ?? []));

    if (!data || data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

function parseDateInput(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return value;
}

function todayInput() {
  const date = new Date();
  return date.toISOString().slice(0, 10);
}

function firstDayOfMonth(dateValue: string) {
  return `${dateValue.slice(0, 7)}-01`;
}

function cleanParam(value: string | null) {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

function chunkArray<T>(values: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function sortByGrossSales<T extends { grossSales: number }>(rows: T[]) {
  return rows.sort((first, second) => second.grossSales - first.grossSales);
}
