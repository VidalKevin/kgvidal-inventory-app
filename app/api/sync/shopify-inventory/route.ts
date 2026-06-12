import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  buildInventoryForecastRows,
  fetchPd90DaySalesBySku,
  fetchForecastMasterData,
  fetchShipheroOnOrderBySku,
  mergeSalesBySku,
} from "@/lib/inventoryForecast";

export const runtime = "nodejs";

type EnvMap = Record<string, string | undefined>;

type ShopifyTokenResponse = {
  access_token: string;
  scope?: string;
  expires_in?: number;
};

type InventoryRow = {
  snapshot_date: string;
  shopify_product_id: string;
  shopify_variant_id: string;
  inventory_item_id: string;
  sku: string;
  product_title: string;
  variant_title: string;
  vendor: string;
  tracked: boolean;
  location_id: string;
  location_name: string;
  available_quantity: number;
};

type EnrichedInventoryRow = InventoryRow & {
  current_qty: number;
  on_order: number;
  sell_90_day: number;
  weekly_sell_rate: number;
  amount_needed: number;
  qty_approved: number;
  days_of_inventory: number;
  status: string;
  lead_time: string;
  review_period: string;
  lead_time_weeks: number;
  review_period_weeks: number;
  uom: number;
};

type ShopifyInventoryResponse = {
  productVariants: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    edges: Array<{
      node: {
        id: string;
        title: string;
        sku: string | null;
        product: {
          id: string;
          title: string;
          vendor: string;
        };
        inventoryItem: {
          id: string;
          tracked: boolean;
          inventoryLevels: {
            edges: Array<{
              node: {
                location: {
                  id: string;
                };
                quantities: Array<{
                  name: string;
                  quantity: number;
                }>;
              };
            }>;
          };
        } | null;
      };
    }>;
  };
};

type Sales90DayResponse = {
  sales: Array<{
    sku: string;
    quantity: number;
  }>;
};

const SHOPIFY_API_VERSION = "2026-04";
const SHOPIFY_VARIANT_QUERY =
  'product_status:active AND (product_type:Nutraceutical OR product_type:Nutraceuticals OR product_type:"Lab Test Public")';
const EXCLUDED_VENDORS = new Set(["labcorp", "nutrition dynamic"]);
const EXCLUDED_VARIANT_TITLES = new Set(["with review", "no review"]);

const INVENTORY_QUERY = `
  query InventorySync($cursor: String, $query: String!) {
    productVariants(first: 100, after: $cursor, query: $query) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          sku
          product {
            id
            title
            vendor
          }
          inventoryItem {
            id
            tracked
            inventoryLevels(first: 20) {
              edges {
                node {
                  location {
                    id
                  }
                  quantities(names: ["available"]) {
                    name
                    quantity
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

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
  const supabaseUrl =
    env.NEXT_PUBLIC_SUPABASE_URL || "https://nlakcdkuktclsncaqotk.supabase.co";

  const serviceRoleKey =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

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

async function getShopifyAccessToken(env: EnvMap) {
  const shop =
    env.SHOPIFY_STORE_DOMAIN ||
    env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
    "nutrition-dynamic.myshopify.com";

  const clientId =
    env.SHOPIFY_CLIENT_ID ||
    env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID;

  const clientSecret =
    env.SHOPIFY_CLIENT_SECRET ||
    env.NEXT_PUBLIC_SHOPIFY_CLIENT_SECRET;

  if (!clientId) {
    throw new Error("Missing SHOPIFY_CLIENT_ID");
  }

  if (!clientSecret) {
    throw new Error("Missing SHOPIFY_CLIENT_SECRET");
  }

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify token request failed: ${errorText}`);
  }

  const data = (await response.json()) as ShopifyTokenResponse;

  if (!data.access_token) {
    throw new Error("Shopify did not return an access token");
  }

  return data.access_token;
}

async function shopifyGraphQL<T>(
  env: EnvMap,
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const shop =
    env.SHOPIFY_STORE_DOMAIN ||
    env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
    "nutrition-dynamic.myshopify.com";

  const response = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok || result.errors) {
    throw new Error(
      `Shopify GraphQL error: ${JSON.stringify(result.errors || result)}`
    );
  }

  return result.data as T;
}

async function getInventoryRows(
  env: EnvMap,
  accessToken: string,
  snapshotDate: string,
  discontinuedSkus: Set<string>
) {
  const rows: InventoryRow[] = [];

  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data: ShopifyInventoryResponse =
      await shopifyGraphQL<ShopifyInventoryResponse>(
        env,
        accessToken,
        INVENTORY_QUERY,
        { cursor, query: SHOPIFY_VARIANT_QUERY }
      );

    for (const edge of data.productVariants.edges) {
      const variant = edge.node;

      if (!variant.sku) {
        continue;
      }

      if (discontinuedSkus.has(variant.sku.trim().toLowerCase())) {
        continue;
      }

      if (EXCLUDED_VENDORS.has(variant.product.vendor.trim().toLowerCase())) {
        continue;
      }

      if (!variant.inventoryItem?.tracked) {
        continue;
      }

      if (EXCLUDED_VARIANT_TITLES.has(variant.title.trim().toLowerCase())) {
        continue;
      }

      for (const level of variant.inventoryItem?.inventoryLevels.edges ?? []) {
        const available =
          level.node.quantities.find((item) => item.name === "available")
            ?.quantity ?? 0;

        rows.push({
          snapshot_date: snapshotDate,
          shopify_product_id: variant.product.id,
          shopify_variant_id: variant.id,
          inventory_item_id: variant.inventoryItem?.id ?? "",
          sku: variant.sku,
          product_title: variant.product.title,
          variant_title: variant.title,
          vendor: variant.product.vendor,
          tracked: variant.inventoryItem?.tracked ?? false,
          location_id: level.node.location.id,
          location_name: "",
          available_quantity: available,
        });
      }
    }

    hasNextPage = data.productVariants.pageInfo.hasNextPage;
    cursor = data.productVariants.pageInfo.endCursor;
  }

  return rows;
}

async function getDiscontinuedSkus(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
) {
  const { data, error } = await supabaseAdmin
    .from("discontinued_items")
    .select("sku");

  if (error) {
    return new Set<string>();
  }

  return new Set(
    (data ?? [])
      .map((row) => String(row.sku ?? "").trim().toLowerCase())
      .filter(Boolean)
  );
}

async function getSalesBySku(origin: string) {
  const response = await fetch(`${origin}/api/shopify/sales-90-day?refresh=1`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return new Map<string, number>();
  }

  const data = (await response.json()) as Sales90DayResponse;

  return new Map(data.sales.map((item) => [item.sku, item.quantity]));
}

function isMissingForecastColumnError(message: string) {
  const lowerMessage = message.toLowerCase();

  return (
    lowerMessage.includes("column") &&
    (lowerMessage.includes("current_qty") ||
      lowerMessage.includes("sell_90_day") ||
      lowerMessage.includes("weekly_sell_rate") ||
      lowerMessage.includes("amount_needed") ||
      lowerMessage.includes("lead_time") ||
      lowerMessage.includes("review_period") ||
      lowerMessage.includes("uom"))
  );
}

async function insertSnapshotRows(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  rows: InventoryRow[],
  enrichedRows: EnrichedInventoryRow[]
) {
  const { error: enrichedError } = await supabaseAdmin
    .from("shopify_inventory_snapshots")
    .insert(enrichedRows);

  if (!enrichedError) {
    return {
      forecastSaved: enrichedRows.length,
      usedForecastColumns: true,
    };
  }

  if (!isMissingForecastColumnError(enrichedError.message)) {
    throw new Error(`Supabase insert failed: ${enrichedError.message}`);
  }

  const { error: rawError } = await supabaseAdmin
    .from("shopify_inventory_snapshots")
    .insert(rows);

  if (rawError) {
    throw new Error(`Supabase insert failed: ${rawError.message}`);
  }

  return {
    forecastSaved: 0,
    usedForecastColumns: false,
  };
}

async function runShopifyInventorySync(origin: string) {
  try {
    const env = await getEnvMap();

    const supabaseAdmin = getSupabaseAdmin(env);
    const accessToken = await getShopifyAccessToken(env);
    const snapshotDate = new Date().toISOString().slice(0, 10);
    const discontinuedSkus = await getDiscontinuedSkus(supabaseAdmin);
    const rows = await getInventoryRows(
      env,
      accessToken,
      snapshotDate,
      discontinuedSkus
    );

    const { error: deleteError } = await supabaseAdmin
      .from("shopify_inventory_snapshots")
      .delete()
      .eq("snapshot_date", snapshotDate);

    if (deleteError) {
      throw new Error(`Supabase snapshot cleanup failed: ${deleteError.message}`);
    }

    if (rows.length === 0) {
      return {
        success: true,
        inserted: 0,
        forecastSaved: 0,
        usedForecastColumns: false,
        snapshotDate,
        message: "No Shopify inventory rows found.",
      };
    }

    const shopifySalesBySku = await getSalesBySku(origin);
    const pdSalesBySku = await fetchPd90DaySalesBySku(
      supabaseAdmin,
      snapshotDate
    );
    const salesBySku = mergeSalesBySku(shopifySalesBySku, pdSalesBySku);
    const onOrderBySku = await fetchShipheroOnOrderBySku(supabaseAdmin);
    const { vendorByName, itemBySku } =
      await fetchForecastMasterData(supabaseAdmin);
    const forecastRows = buildInventoryForecastRows(
      rows,
      salesBySku,
      vendorByName,
      itemBySku,
      onOrderBySku
    );

    const forecastBySku = new Map(
      forecastRows.map((row) => [row.sku.trim().toLowerCase(), row])
    );
    const enrichedRows = rows.map((row) => {
      const forecast = forecastBySku.get(row.sku.trim().toLowerCase());

      return {
        ...row,
        vendor: forecast?.vendor ?? row.vendor,
        current_qty: forecast?.current_qty ?? row.available_quantity,
        on_order: forecast?.on_order ?? 0,
        sell_90_day: forecast?.sell_90_day ?? 0,
        weekly_sell_rate: forecast?.weekly_sell_rate ?? 0,
        amount_needed: forecast?.amount_needed ?? 0,
        qty_approved: forecast?.qty_approved ?? 0,
        days_of_inventory: forecast?.days_of_inventory ?? 0,
        status: forecast?.status ?? "Healthy",
        lead_time: forecast?.lead_time ?? "",
        review_period: forecast?.review_period ?? "",
        lead_time_weeks: forecast?.lead_time_weeks ?? 0,
        review_period_weeks: forecast?.review_period_weeks ?? 0,
        uom: forecast?.uom ?? 1,
      };
    });

    const insertResult = await insertSnapshotRows(
      supabaseAdmin,
      rows,
      enrichedRows
    );

    return {
      success: true,
      inserted: rows.length,
      forecastSaved: insertResult.forecastSaved,
      usedForecastColumns: insertResult.usedForecastColumns,
      snapshotDate,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sync error";

    return {
      success: false,
      error: message,
    };
  }
}

export async function GET(request: Request) {
  const result = await runShopifyInventorySync(new URL(request.url).origin);

  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
