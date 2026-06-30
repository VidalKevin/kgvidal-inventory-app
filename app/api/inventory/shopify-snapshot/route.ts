import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient } from "@supabase/supabase-js";
import {
  buildInventoryForecastRows,
  fetchPd90DaySalesBySku,
  fetchForecastMasterData,
  fetchShipheroOnOrderBySku,
  mergeSalesBySku,
  resolveUomForSku,
  type ItemMasterRow,
  type ShopifySnapshotRow,
  toInventoryClientRow,
} from "@/lib/inventoryForecast";

export const runtime = "nodejs";

type EnvMap = Record<string, string | undefined>;

type Sales90DayResponse = {
  sales: Array<{
    sku: string;
    quantity: number;
  }>;
};

type InventorySnapshotResponse = {
  snapshotDate: string | null;
  dates: string[];
  rows: ReturnType<typeof toInventoryClientRow>[];
};

type SavedSnapshotRow = ShopifySnapshotRow & {
  current_qty?: number | null;
  on_order?: number | null;
  sell_90_day?: number | null;
  weekly_sell_rate?: number | null;
  amount_needed?: number | null;
  qty_approved?: number | null;
  days_of_inventory?: number | null;
  status?: "Healthy" | "Low Stocks" | "Critical" | null;
  lead_time?: string | null;
  review_period?: string | null;
  lead_time_weeks?: number | null;
  review_period_weeks?: number | null;
  uom?: number | null;
};

type ApprovedQtyPayload = {
  snapshotDate?: string;
  sku?: string;
  qtyApproved?: number;
};

const INVENTORY_CACHE_TTL_MS = 5 * 60 * 1000;

const inventoryCache = new Map<
  string,
  {
    expiresAt: number;
    data: InventorySnapshotResponse;
  }
>();

async function getEnvMap(): Promise<EnvMap> {
  try {
    const context = await getCloudflareContext({ async: true });
    return {
      ...process.env,
      ...(context.env as EnvMap),
    };
  } catch {
    return process.env;
  }
}

function getSupabaseAdmin(env: EnvMap) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function getSalesBySku(origin: string) {
  const response = await fetch(
    `${origin}/api/shopify/sales-90-day`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    return new Map<string, number>();
  }

  const data = (await response.json()) as Sales90DayResponse;

  return new Map(data.sales.map((item) => [item.sku, item.quantity]));
}

function hasSavedForecastColumns(row: SavedSnapshotRow) {
  return (
    row.current_qty !== undefined &&
    row.sell_90_day !== undefined &&
    row.weekly_sell_rate !== undefined &&
    row.amount_needed !== undefined &&
    row.qty_approved !== undefined
  );
}

function numberValue(value: number | null | undefined) {
  return Number(value ?? 0);
}

function savedSnapshotRowsToClientRows(
  rows: SavedSnapshotRow[],
  itemBySku: Map<string, ItemMasterRow>
) {
  const grouped = new Map<string, SavedSnapshotRow>();

  for (const row of rows) {
    if (!row.sku) {
      continue;
    }

    const skuKey = row.sku.trim().toLowerCase();
    const existing = grouped.get(skuKey);

    if (!existing) {
      grouped.set(skuKey, { ...row });
      continue;
    }

    existing.available_quantity =
      numberValue(existing.available_quantity) + numberValue(row.available_quantity);
    existing.current_qty = existing.available_quantity;
  }

  return Array.from(grouped.values()).map((row) => ({
    date: row.snapshot_date,
    productTitle: row.product_title,
    variantTitle: row.variant_title,
    sku: row.sku,
    vendor: row.vendor ?? "",
    currentQty: numberValue(row.current_qty),
    onOrder: numberValue(row.on_order),
    sell90Day: numberValue(row.sell_90_day),
    weeklyRate: numberValue(row.weekly_sell_rate),
    qtyNeeded: numberValue(row.amount_needed),
    qtyApproved: numberValue(row.qty_approved),
    daysOfInventory: numberValue(row.days_of_inventory),
    status: row.status ?? "Healthy",
    leadTime: row.lead_time ?? "",
    reviewPeriod: row.review_period ?? "",
    leadTimeWeeks: numberValue(row.lead_time_weeks),
    reviewPeriodWeeks: numberValue(row.review_period_weeks),
    uom: resolveUomForSku(row.sku, itemBySku, numberValue(row.uom) || 1),
  }));
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const refresh = requestUrl.searchParams.get("refresh") === "1";
    const requestedDate = requestUrl.searchParams.get("date")?.trim() ?? "";
    const cacheKey = requestedDate || "latest";

    const cached = inventoryCache.get(cacheKey);

    if (!refresh && cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
      });
    }

    const env = await getEnvMap();
    const supabaseAdmin = getSupabaseAdmin(env);

    const { data: dateRows, error: datesError } = await supabaseAdmin
      .from("shopify_inventory_snapshots")
      .select("snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(10000);

    if (datesError) {
      throw new Error(`Supabase snapshot dates failed: ${datesError.message}`);
    }

    const dates = Array.from(
      new Set((dateRows ?? []).map((row) => String(row.snapshot_date)))
    ).filter(Boolean);
    const snapshotDate = requestedDate || dates[0] || null;

    if (!snapshotDate) {
      const emptyResponse = {
        snapshotDate: null,
        dates: [],
        rows: [],
      };

      inventoryCache.set(cacheKey, {
        expiresAt: Date.now() + INVENTORY_CACHE_TTL_MS,
        data: emptyResponse,
      });

      return NextResponse.json(emptyResponse);
    }

    const savedColumns =
      "snapshot_date, product_title, variant_title, sku, vendor, available_quantity, current_qty, on_order, sell_90_day, weekly_sell_rate, amount_needed, qty_approved, days_of_inventory, status, lead_time, review_period, lead_time_weeks, review_period_weeks, uom";
    const rawColumns =
      "snapshot_date, product_title, variant_title, sku, vendor, available_quantity";

    const savedResult = await supabaseAdmin
      .from("shopify_inventory_snapshots")
      .select(savedColumns)
      .eq("snapshot_date", snapshotDate)
      .order("product_title", { ascending: true });
    let snapshotRows = (savedResult.data ?? []) as SavedSnapshotRow[];
    let error = savedResult.error;

    if (error) {
      const missingForecastColumns =
        error.message.toLowerCase().includes("column") ||
        error.message.toLowerCase().includes("schema cache");

      if (!missingForecastColumns) {
        throw new Error(`Supabase inventory fetch failed: ${error.message}`);
      }

      const rawResult = await supabaseAdmin
        .from("shopify_inventory_snapshots")
        .select(rawColumns)
        .eq("snapshot_date", snapshotDate)
        .order("product_title", { ascending: true });

      snapshotRows = (rawResult.data ?? []) as SavedSnapshotRow[];
      error = rawResult.error;

      if (error) {
        throw new Error(`Supabase inventory fetch failed: ${error.message}`);
      }
    }

    if (!refresh && snapshotRows[0] && hasSavedForecastColumns(snapshotRows[0])) {
      const { itemBySku } = await fetchForecastMasterData(supabaseAdmin);
      const responseData = {
        snapshotDate,
        dates,
        rows: savedSnapshotRowsToClientRows(snapshotRows, itemBySku),
      };

      inventoryCache.set(cacheKey, {
        expiresAt: Date.now() + INVENTORY_CACHE_TTL_MS,
        data: responseData,
      });

      return NextResponse.json(responseData);
    }

    const shopifySalesBySku = await getSalesBySku(new URL(request.url).origin);
    const pdSalesBySku = await fetchPd90DaySalesBySku(
      supabaseAdmin,
      snapshotDate
    );
    const salesBySku = mergeSalesBySku(shopifySalesBySku, pdSalesBySku);
    const onOrderBySku = await fetchShipheroOnOrderBySku(supabaseAdmin, {
      freshForDate: snapshotDate,
    });
    const { vendorByName, itemBySku } =
      await fetchForecastMasterData(supabaseAdmin);
    const forecastRows = buildInventoryForecastRows(
      snapshotRows as ShopifySnapshotRow[],
      salesBySku,
      vendorByName,
      itemBySku,
      onOrderBySku
    );

    const responseData = {
      snapshotDate,
      dates,
      rows: forecastRows.map(toInventoryClientRow),
    };

    inventoryCache.set(cacheKey, {
      expiresAt: Date.now() + INVENTORY_CACHE_TTL_MS,
      data: responseData,
    });

    return NextResponse.json(responseData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown inventory fetch error";

    return NextResponse.json(
      {
        error: message,
        rows: [],
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as ApprovedQtyPayload;
    const snapshotDate = payload.snapshotDate?.trim();
    const sku = payload.sku?.trim();
    const qtyApproved = Number(payload.qtyApproved ?? 0);

    if (!snapshotDate) {
      throw new Error("Missing snapshotDate");
    }

    if (!sku) {
      throw new Error("Missing sku");
    }

    if (!Number.isFinite(qtyApproved) || qtyApproved < 0) {
      throw new Error("Invalid qtyApproved");
    }

    const env = await getEnvMap();
    const supabaseAdmin = getSupabaseAdmin(env);
    const { error } = await supabaseAdmin
      .from("shopify_inventory_snapshots")
      .update({ qty_approved: qtyApproved })
      .eq("snapshot_date", snapshotDate)
      .eq("sku", sku);

    if (error) {
      throw new Error(`Supabase approved quantity update failed: ${error.message}`);
    }

    inventoryCache.clear();

    return NextResponse.json({
      success: true,
      snapshotDate,
      sku,
      qtyApproved,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown approved quantity error";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
