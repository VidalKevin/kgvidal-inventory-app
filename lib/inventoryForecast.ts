import type { SupabaseClient } from "@supabase/supabase-js";

export type InventoryStatus = "Healthy" | "Low Stocks" | "Critical";

export type ShopifySnapshotRow = {
  snapshot_date: string;
  product_title: string;
  variant_title: string;
  sku: string;
  vendor: string | null;
  available_quantity: number | null;
};

export type VendorMasterRow = {
  mfg: string;
  lead_time: string | null;
  review_period: string | null;
};

export type ItemMasterRow = {
  product_variant_sku: string;
  product_vendor: string | null;
  uom: string | null;
};

type Pd90DaySaleRow = {
  product_variant_sku: string | null;
  quantity: number | null;
};

type ShipheroIntransitRow = {
  sku: string | null;
  quantity: number | null;
  synced_at?: string | null;
};

export type InventoryForecastDbRow = {
  snapshot_date: string;
  product_title: string;
  variant_title: string;
  sku: string;
  vendor: string;
  current_qty: number;
  on_order: number;
  sell_90_day: number;
  weekly_sell_rate: number;
  amount_needed: number;
  qty_approved: number;
  days_of_inventory: number;
  status: InventoryStatus;
  lead_time: string;
  review_period: string;
  lead_time_weeks: number;
  review_period_weeks: number;
  uom: number;
};

export type InventoryForecastClientRow = {
  date: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  vendor: string;
  currentQty: number;
  onOrder: number;
  sell90Day: number;
  weeklyRate: number;
  qtyNeeded: number;
  qtyApproved: number;
  daysOfInventory: number;
  status: InventoryStatus;
  leadTime: string;
  reviewPeriod: string;
  leadTimeWeeks: number;
  reviewPeriodWeeks: number;
  uom: number;
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

export const BUSINESS_TIME_ZONE = "America/New_York";

export function getBusinessDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

export function getBusinessDateDaysAgo(days: number) {
  const date = new Date(`${getBusinessDateString()}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);

  return date.toISOString().slice(0, 10);
}

function getPdWeekStart(snapshotDate: string) {
  const date = new Date(`${snapshotDate}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const firstPdDate = Date.UTC(2026, 5, 8);
  const lastPdDate = Date.UTC(2026, 7, 31);
  const snapshotTime = date.getTime();

  if (snapshotTime < firstPdDate || snapshotTime > lastPdDate) {
    return null;
  }

  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + mondayOffset);

  return date.toISOString().slice(0, 10);
}

function parsePositiveNumber(value: string | null | undefined) {
  const match = String(value ?? "").match(/[\d.]+/);
  const parsed = match ? Number(match[0]) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function parseWeeks(value: string | null | undefined) {
  const text = String(value ?? "").toLowerCase();
  const amount = parsePositiveNumber(text);

  if (!amount) {
    return 0;
  }

  if (text.includes("day")) {
    return amount / 7;
  }

  if (text.includes("month")) {
    return amount * 4;
  }

  return amount;
}

export function parseUom(value: string | null | undefined) {
  const parsed = Math.round(parsePositiveNumber(value));
  return parsed > 0 ? parsed : 1;
}

export function resolveUomForSku(
  sku: string,
  itemBySku: Map<string, ItemMasterRow>,
  fallback = 1
) {
  const itemMaster = itemBySku.get(normalizeKey(sku));

  if (itemMaster?.uom) {
    return parseUom(itemMaster.uom);
  }

  return Number.isFinite(fallback) && fallback > 0 ? fallback : 1;
}

export function roundUpToUom(value: number, uom: number) {
  const safeUom = uom > 0 ? uom : 1;
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;

  if (safeValue === 0) {
    return 0;
  }

  return Math.ceil(safeValue / safeUom) * safeUom;
}

function getStatus(currentQty: number): InventoryStatus {
  if (currentQty <= 10) {
    return "Critical";
  }

  if (currentQty <= 50) {
    return "Low Stocks";
  }

  return "Healthy";
}

function getDaysOfInventory(currentQty: number, weeklyRate: number) {
  if (weeklyRate <= 0) {
    return 0;
  }

  return Math.floor((currentQty / weeklyRate) * 7);
}

function getAmountNeeded(
  weeklyRate: number,
  leadTimeWeeks: number,
  reviewPeriodWeeks: number,
  currentQty: number,
  onOrder: number
) {
  return Math.round(
    Math.max(
      weeklyRate * (leadTimeWeeks + reviewPeriodWeeks) - currentQty - onOrder,
      0
    )
  );
}

export async function fetchForecastMasterData(supabaseAdmin: SupabaseClient) {
  const [{ data: vendors, error: vendorError }, { data: items, error: itemError }] =
    await Promise.all([
      supabaseAdmin
        .from("vendor_list")
        .select("mfg, lead_time, review_period"),
      supabaseAdmin
        .from("item_master_list")
        .select("product_variant_sku, product_vendor, uom"),
    ]);

  if (vendorError) {
    throw new Error(`Supabase vendor list fetch failed: ${vendorError.message}`);
  }

  if (itemError) {
    throw new Error(`Supabase item master fetch failed: ${itemError.message}`);
  }

  const vendorByName = new Map<string, VendorMasterRow>();
  const itemBySku = new Map<string, ItemMasterRow>();

  for (const vendor of (vendors ?? []) as VendorMasterRow[]) {
    vendorByName.set(normalizeKey(vendor.mfg), vendor);
  }

  for (const item of (items ?? []) as ItemMasterRow[]) {
    itemBySku.set(normalizeKey(item.product_variant_sku), item);
  }

  return { vendorByName, itemBySku };
}

export async function fetchPd90DaySalesBySku(
  supabaseAdmin: SupabaseClient,
  snapshotDate: string
) {
  const weekStart = getPdWeekStart(snapshotDate);
  const salesBySku = new Map<string, number>();

  if (!weekStart) {
    return salesBySku;
  }

  const { data, error } = await supabaseAdmin
    .from("pd_90_day_sale")
    .select("product_variant_sku, quantity")
    .eq("week_start", weekStart);

  if (error) {
    throw new Error(`Supabase PD 90 day sale fetch failed: ${error.message}`);
  }

  for (const row of (data ?? []) as Pd90DaySaleRow[]) {
    const skuKey = normalizeKey(String(row.product_variant_sku ?? ""));

    if (!skuKey) {
      continue;
    }

    salesBySku.set(skuKey, (salesBySku.get(skuKey) ?? 0) + Number(row.quantity ?? 0));
  }

  return salesBySku;
}

export async function fetchShipheroOnOrderBySku(
  supabaseAdmin: SupabaseClient,
  options: { freshForDate?: string | null } = {}
) {
  const { data, error } = await supabaseAdmin
    .from("shiphero_intransit_items")
    .select("sku, quantity, synced_at");
  const onOrderBySku = new Map<string, number>();

  if (error) {
    const missingTable =
      error.message.toLowerCase().includes("does not exist") ||
      error.message.toLowerCase().includes("schema cache");

    if (missingTable) {
      return onOrderBySku;
    }

    throw new Error(`Supabase Shiphero in-transit fetch failed: ${error.message}`);
  }

  const rows = (data ?? []) as ShipheroIntransitRow[];

  if (
    options.freshForDate &&
    rows.length > 0 &&
    !rows.some(
      (row) =>
        row.synced_at &&
        getBusinessDateString(new Date(row.synced_at)) === options.freshForDate
    )
  ) {
    return onOrderBySku;
  }

  for (const row of rows) {
    const skuKey = normalizeKey(String(row.sku ?? ""));

    if (!skuKey) {
      continue;
    }

    onOrderBySku.set(skuKey, (onOrderBySku.get(skuKey) ?? 0) + Number(row.quantity ?? 0));
  }

  return onOrderBySku;
}

export function mergeSalesBySku(...salesMaps: Map<string, number>[]) {
  const merged = new Map<string, number>();

  for (const salesMap of salesMaps) {
    for (const [sku, quantity] of salesMap) {
      const skuKey = normalizeKey(sku);

      if (!skuKey) {
        continue;
      }

      merged.set(skuKey, (merged.get(skuKey) ?? 0) + Number(quantity ?? 0));
    }
  }

  return merged;
}

export function buildInventoryForecastRows(
  snapshotRows: ShopifySnapshotRow[],
  salesBySku: Map<string, number>,
  vendorByName: Map<string, VendorMasterRow>,
  itemBySku: Map<string, ItemMasterRow>,
  onOrderBySku = new Map<string, number>()
) {
  const grouped = new Map<string, InventoryForecastDbRow>();

  for (const row of snapshotRows) {
    if (!row.sku) {
      continue;
    }

    const skuKey = normalizeKey(row.sku);
    const available = row.available_quantity ?? 0;
    const existing = grouped.get(skuKey);

    if (existing) {
      existing.current_qty += available;
      existing.days_of_inventory = getDaysOfInventory(
        existing.current_qty,
        existing.weekly_sell_rate
      );
      existing.amount_needed = getAmountNeeded(
        existing.weekly_sell_rate,
        existing.lead_time_weeks,
        existing.review_period_weeks,
        existing.current_qty,
        existing.on_order
      );
      existing.status = getStatus(existing.current_qty);
      continue;
    }

    const itemMaster = itemBySku.get(skuKey);
    const itemMasterVendor = itemMaster?.product_vendor?.trim() ?? "";
    const vendor = itemMasterVendor.toLowerCase().startsWith("vidal -")
      ? itemMasterVendor
      : row.vendor ?? "";
    const vendorMaster = vendorByName.get(normalizeKey(vendor));
    const sell90Day = salesBySku.get(skuKey) ?? salesBySku.get(row.sku) ?? 0;
    const weeklyRate = Math.ceil((sell90Day / 90) * 7);
    const leadTime = vendorMaster?.lead_time ?? "";
    const reviewPeriod = vendorMaster?.review_period ?? "";
    const leadTimeWeeks = parseWeeks(leadTime);
    const reviewPeriodWeeks = parseWeeks(reviewPeriod);
    const onOrder = onOrderBySku.get(skuKey) ?? 0;
    const amountNeeded = getAmountNeeded(
      weeklyRate,
      leadTimeWeeks,
      reviewPeriodWeeks,
      available,
      onOrder
    );

    grouped.set(skuKey, {
      snapshot_date: row.snapshot_date,
      product_title: row.product_title,
      variant_title: row.variant_title,
      sku: row.sku,
      vendor,
      current_qty: available,
      on_order: onOrder,
      sell_90_day: sell90Day,
      weekly_sell_rate: weeklyRate,
      amount_needed: amountNeeded,
      qty_approved: 0,
      days_of_inventory: getDaysOfInventory(available, weeklyRate),
      status: getStatus(available),
      lead_time: leadTime,
      review_period: reviewPeriod,
      lead_time_weeks: leadTimeWeeks,
      review_period_weeks: reviewPeriodWeeks,
      uom: parseUom(itemMaster?.uom),
    });
  }

  return Array.from(grouped.values());
}

export function toInventoryClientRow(
  row: InventoryForecastDbRow
): InventoryForecastClientRow {
  return {
    date: row.snapshot_date,
    productTitle: row.product_title,
    variantTitle: row.variant_title,
    sku: row.sku,
    vendor: row.vendor,
    currentQty: row.current_qty,
    onOrder: row.on_order,
    sell90Day: row.sell_90_day,
    weeklyRate: row.weekly_sell_rate,
    qtyNeeded: row.amount_needed,
    qtyApproved: row.qty_approved,
    daysOfInventory: row.days_of_inventory,
    status: row.status,
    leadTime: row.lead_time,
    reviewPeriod: row.review_period,
    leadTimeWeeks: row.lead_time_weeks,
    reviewPeriodWeeks: row.review_period_weeks,
    uom: row.uom,
  };
}
