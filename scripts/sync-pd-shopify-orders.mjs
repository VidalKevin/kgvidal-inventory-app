import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

const SHOPIFY_API_VERSION = "2026-04";
const HISTORICAL_SYNC_TYPE = "pd_orders_historical";
const INCREMENTAL_SYNC_TYPE = "pd_orders_incremental";
const DEFAULT_START_DATE = "2025-01-01";

let cachedAccessToken = null;

loadDotEnvLocal();

const ORDERS_QUERY = `
  query PdOrders($cursor: String, $query: String!) {
    orders(first: 50, after: $cursor, query: $query, sortKey: PROCESSED_AT) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          processedAt
          createdAt
          updatedAt
          displayFinancialStatus
          cancelledAt
          shippingAddress {
            country
            countryCodeV2
          }
          currentSubtotalPriceSet {
            shopMoney {
              amount
            }
          }
          currentTotalDiscountsSet {
            shopMoney {
              amount
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
            }
          }
          totalDiscountsSet {
            shopMoney {
              amount
            }
          }
          totalRefundedSet {
            shopMoney {
              amount
            }
          }
          refunds(first: 50) {
            id
            createdAt
            refundLineItems(first: 250) {
              edges {
                node {
                  id
                  quantity
                  subtotalSet {
                    shopMoney {
                      amount
                    }
                  }
                  lineItem {
                    sku
                    title
                  }
                }
              }
            }
          }
          transactions(first: 100) {
            gateway
            formattedGateway
            kind
            status
            amountSet {
              shopMoney {
                amount
              }
            }
          }
          lineItems(first: 250) {
            edges {
              node {
                id
                sku
                title
                quantity
                currentQuantity
                vendor
                product {
                  title
                  vendor
                  productType
                }
                originalTotalSet {
                  shopMoney {
                    amount
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

const ORDERS_QUERY_WITHOUT_PRODUCT = `
  query PdOrdersWithoutProduct($cursor: String, $query: String!) {
    orders(first: 50, after: $cursor, query: $query, sortKey: PROCESSED_AT) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          processedAt
          createdAt
          updatedAt
          displayFinancialStatus
          cancelledAt
          shippingAddress {
            country
            countryCodeV2
          }
          currentSubtotalPriceSet {
            shopMoney {
              amount
            }
          }
          currentTotalDiscountsSet {
            shopMoney {
              amount
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
            }
          }
          totalDiscountsSet {
            shopMoney {
              amount
            }
          }
          totalRefundedSet {
            shopMoney {
              amount
            }
          }
          refunds(first: 50) {
            id
            createdAt
            refundLineItems(first: 250) {
              edges {
                node {
                  id
                  quantity
                  subtotalSet {
                    shopMoney {
                      amount
                    }
                  }
                  lineItem {
                    sku
                    title
                  }
                }
              }
            }
          }
          transactions(first: 100) {
            gateway
            formattedGateway
            kind
            status
            amountSet {
              shopMoney {
                amount
              }
            }
          }
          lineItems(first: 250) {
            edges {
              node {
                id
                sku
                title
                quantity
                currentQuantity
                vendor
                originalTotalSet {
                  shopMoney {
                    amount
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

function parseArgs() {
  const args = new Map();

  for (let index = 2; index < process.argv.length; index += 1) {
    const key = process.argv[index];
    const value = process.argv[index + 1];

    if (key?.startsWith("--") && value && !value.startsWith("--")) {
      args.set(key.slice(2), value);
      index += 1;
    }
  }

  return args;
}

function loadDotEnvLocal() {
  const envPath = ".env.local";

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

function optionalEnv(name) {
  return process.env[name]?.trim() || "";
}

function getSupabase() {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

async function shopifyGraphQL(query, variables, options = {}) {
  const storeDomain = requiredEnv("SHOPIFY_PD_STORE_DOMAIN");
  const accessToken = await getShopifyAccessToken(storeDomain);
  const response = await fetch(
    `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  const result = await parseJsonResponse(response, "Practitioner Depot Shopify");

  if (!response.ok || result.errors) {
    const errorText = JSON.stringify(result.errors || result);

    if (!options.tokenRetried && errorText.includes("Invalid API key or access token")) {
      cachedAccessToken = null;
      console.warn("PD Shopify token was rejected. Refreshing token and retrying page.");
      return shopifyGraphQL(query, variables, {
        ...options,
        tokenRetried: true,
      });
    }

    if (
      options.allowProductScopeFallback &&
      Array.isArray(result.errors) &&
      result.errors.some((error) =>
        String(error?.extensions?.requiredAccess ?? "").includes("read_products")
      )
    ) {
      console.warn(
        "PD Shopify token is missing read_products. Importing without product type details."
      );
      return shopifyGraphQL(ORDERS_QUERY_WITHOUT_PRODUCT, variables);
    }

    throw new Error(`Practitioner Depot Shopify error: ${errorText}`);
  }

  return result.data;
}

async function getShopifyAccessToken(storeDomain) {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  const adminAccessToken = optionalEnv("SHOPIFY_PD_ADMIN_ACCESS_TOKEN");

  if (adminAccessToken) {
    cachedAccessToken = adminAccessToken;
    return cachedAccessToken;
  }

  const clientId = requiredEnv("SHOPIFY_PD_CLIENT_ID");
  const clientSecret = requiredEnv("SHOPIFY_PD_CLIENT_SECRET");
  const response = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
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
  const data = await parseJsonResponse(response, "Practitioner Depot Shopify token");

  if (!response.ok || !data.access_token) {
    throw new Error(`Practitioner Depot Shopify token error: ${JSON.stringify(data)}`);
  }

  cachedAccessToken = data.access_token;
  return cachedAccessToken;
}

async function parseJsonResponse(response, label) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `${label} returned non-JSON response (${response.status}): ${text.slice(0, 300)}`
    );
  }
}

function isTransientShopifyError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("returned non-JSON response") ||
    message.includes("Throttled") ||
    message.includes("Too Many Requests")
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function moneyValue(moneySet) {
  return Number(moneySet?.shopMoney?.amount ?? 0) || 0;
}

function shopifyId(id) {
  return String(id ?? "").split("/").pop() || String(id ?? "");
}

function orderGross(order) {
  const lineGross = order.lineItems.edges.reduce(
    (total, edge) => total + moneyValue(edge.node.originalTotalSet),
    0
  );

  return lineGross || moneyValue(order.subtotalPriceSet) || moneyValue(order.currentSubtotalPriceSet);
}

function orderNet(order) {
  return Math.max(orderGross(order) - moneyValue(order.totalDiscountsSet), 0);
}

function giftCardAmount(order) {
  return order.transactions.reduce((total, transaction) => {
    const gateway = `${transaction.gateway ?? ""} ${transaction.formattedGateway ?? ""}`.toLowerCase();
    const kind = String(transaction.kind ?? "").toUpperCase();
    const status = String(transaction.status ?? "").toUpperCase();
    const isGiftCard = gateway.includes("gift");
    const isMoneyIn = ["SALE", "CAPTURE"].includes(kind);
    const isSuccessful = !status || ["SUCCESS", "PENDING"].includes(status);

    return isGiftCard && isMoneyIn && isSuccessful
      ? total + moneyValue(transaction.amountSet)
      : total;
  }, 0);
}

function shippingCountry(order) {
  return order.shippingAddress?.country || order.shippingAddress?.countryCodeV2 || null;
}

function orderRow(order) {
  return {
    shopify_order_id: shopifyId(order.id),
    order_number: order.name,
    processed_at: order.processedAt,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    shipping_country: shippingCountry(order),
    gross_sales: roundMoney(orderGross(order)),
    net_sales: roundMoney(orderNet(order)),
    gift_card_amount: roundMoney(giftCardAmount(order)),
    raw_updated_at: order.updatedAt,
  };
}

function itemRows(order) {
  const processedAt = order.processedAt;
  const orderId = shopifyId(order.id);

  return order.lineItems.edges.map((edge) => {
    const item = edge.node;

    return {
      shopify_order_id: orderId,
      shopify_line_item_id: shopifyId(item.id),
      processed_at: processedAt,
      sku: item.sku,
      product_title: item.product?.title || item.title,
      vendor: item.product?.vendor || item.vendor,
      product_type: item.product?.productType || null,
      quantity: Number(item.quantity ?? 0),
      gross_sales: roundMoney(moneyValue(item.originalTotalSet)),
    };
  });
}

function refundRows(order) {
  const orderId = shopifyId(order.id);

  return (order.refunds ?? []).flatMap((refund) => {
    const refundId = shopifyId(refund.id);

    return refund.refundLineItems.edges.map((edge) => {
      const refundItem = edge.node;

      return {
        shopify_order_id: orderId,
        order_number: order.name,
        shopify_refund_id: refundId,
        shopify_refund_line_item_id: shopifyId(refundItem.id),
        refund_created_at: refund.createdAt,
        sku: refundItem.lineItem?.sku ?? null,
        product_title: refundItem.lineItem?.title ?? null,
        quantity: Number(refundItem.quantity ?? 0),
        return_amount: roundMoney(moneyValue(refundItem.subtotalSet)),
      };
    });
  });
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

async function getSyncState(supabase, syncType) {
  const { data, error } = await supabase
    .from("pd_sync_state")
    .select("last_synced_at,last_cursor")
    .eq("sync_type", syncType)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function updateSyncState(supabase, syncType, values) {
  const { error } = await supabase.from("pd_sync_state").upsert(
    {
      sync_type: syncType,
      ...values,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "sync_type" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function upsertOrders(supabase, orders) {
  if (orders.length === 0) {
    return;
  }

  const { error: ordersError } = await supabase.from("pd_orders").upsert(
    orders.map(orderRow),
    { onConflict: "shopify_order_id" }
  );

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  const items = orders.flatMap(itemRows);
  const refunds = orders.flatMap(refundRows);

  if (items.length === 0) {
    if (refunds.length === 0) {
      return;
    }
  } else {
    const { error: itemsError } = await supabase.from("pd_order_items").upsert(items, {
      onConflict: "shopify_line_item_id",
    });

    if (itemsError) {
      throw new Error(itemsError.message);
    }
  }

  if (refunds.length === 0) {
    return;
  }

  const { error: refundsError } = await supabase
    .from("pd_order_returns")
    .upsert(refunds, {
      onConflict: "shopify_refund_line_item_id",
    });

  if (refundsError) {
    throw new Error(refundsError.message);
  }
}

function buildQuery(mode, startDate, endDate, lastSyncedAt) {
  if (mode === "incremental") {
    return `updated_at:>=${lastSyncedAt || startDate}`;
  }

  return `processed_at:>=${startDate} processed_at:<=${endDate}`;
}

async function run() {
  const args = parseArgs();
  const mode = args.get("mode") || "incremental";
  const startDate = args.get("start") || DEFAULT_START_DATE;
  const endDate = args.get("end") || new Date().toISOString().slice(0, 10);
  const syncType = mode === "historical" ? HISTORICAL_SYNC_TYPE : INCREMENTAL_SYNC_TYPE;
  const supabase = getSupabase();
  const syncState = await getSyncState(supabase, syncType);
  const query = buildQuery(mode, startDate, endDate, syncState?.last_synced_at);
  let cursor = syncState?.last_cursor || null;
  let hasNextPage = true;
  let importedOrders = 0;

  await updateSyncState(supabase, syncType, {
    status: "running",
    message: `Starting ${mode} sync with query: ${query}`,
  });

  while (hasNextPage) {
    const data = await fetchOrdersPageWithRetry(cursor, query);
    const orders = data.orders.edges.map((edge) => edge.node);

    await upsertOrders(supabase, orders);
    importedOrders += orders.length;

    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;

    await updateSyncState(supabase, syncType, {
      last_cursor: cursor,
      status: "running",
      message: `Imported ${importedOrders} orders.`,
    });

    console.log(`Imported ${importedOrders} orders...`);
  }

  await updateSyncState(supabase, syncType, {
    last_synced_at: new Date().toISOString(),
    last_cursor: null,
    status: "complete",
    message: `Imported ${importedOrders} orders.`,
  });

  if (mode === "historical") {
    await updateSyncState(supabase, INCREMENTAL_SYNC_TYPE, {
      last_synced_at: new Date().toISOString(),
      last_cursor: null,
      status: "ready",
      message: "Historical import completed. Incremental sync can start from this point.",
    });
  }

  console.log(`PD Shopify ${mode} sync complete. Imported ${importedOrders} orders.`);
}

async function fetchOrdersPageWithRetry(cursor, query) {
  try {
    return await shopifyGraphQL(
      ORDERS_QUERY,
      { cursor, query },
      { allowProductScopeFallback: true }
    );
  } catch (error) {
    if (!isTransientShopifyError(error)) {
      throw error;
    }

    console.warn(
      `Transient PD Shopify response. Waiting 5 seconds and retrying page: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    cachedAccessToken = null;
    await sleep(5000);

    return shopifyGraphQL(
      ORDERS_QUERY,
      { cursor, query },
      { allowProductScopeFallback: true }
    );
  }
}

run().catch(async (error) => {
  console.error(error);

  try {
    const args = parseArgs();
    const mode = args.get("mode") || "incremental";
    const syncType =
      mode === "historical" ? HISTORICAL_SYNC_TYPE : INCREMENTAL_SYNC_TYPE;
    const supabase = getSupabase();
    await updateSyncState(supabase, syncType, {
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  } catch (stateError) {
    console.error(stateError);
  }

  process.exit(1);
});
