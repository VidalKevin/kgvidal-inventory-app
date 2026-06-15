import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getBusinessDateDaysAgo, getBusinessDateString } from "@/lib/inventoryForecast";

export const runtime = "nodejs";

type EnvMap = Record<string, string | undefined>;

type ShopifyTokenResponse = {
  access_token: string;
};

type SalesSummary = {
  sku: string;
  quantity: number;
};

type ShopifyOrdersResponse = {
  orders: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    edges: Array<{
      node: {
        cancelledAt: string | null;
        displayFinancialStatus: string;
        lineItems: {
          edges: Array<{
            node: {
              sku: string | null;
              quantity: number;
              currentQuantity: number;
              variant: {
                product: {
                  productType: string;
                  status: string;
                };
              } | null;
            };
          }>;
        };
      };
    }>;
  };
};

const SHOPIFY_API_VERSION = "2026-04";
const INCLUDED_PRODUCT_TYPES = new Set([
  "Nutraceutical",
  "Nutraceuticals",
  "Lab Test Public",
]);
const COUNTED_FINANCIAL_STATUSES = new Set([
  "PAID",
  "PARTIALLY_PAID",
  "PARTIALLY_REFUNDED",
]);
const SALES_CACHE_TTL_MS = 30 * 60 * 1000;

let salesCache:
  | {
      expiresAt: number;
      data: Awaited<ReturnType<typeof getSalesSummaries>>;
    }
  | null = null;

const ORDERS_QUERY = `
  query Sales90Day($cursor: String, $query: String!) {
    orders(first: 50, after: $cursor, query: $query, sortKey: CREATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          cancelledAt
          displayFinancialStatus
          lineItems(first: 100) {
            edges {
              node {
                sku
                quantity
                currentQuantity
                variant {
                  product {
                    productType
                    status
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

function getShop(env: EnvMap) {
  return (
    env.SHOPIFY_STORE_DOMAIN ||
    env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
    "nutrition-dynamic.myshopify.com"
  );
}

async function getShopifyAccessToken(env: EnvMap) {
  const clientId = env.SHOPIFY_CLIENT_ID || env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID;
  const clientSecret =
    env.SHOPIFY_CLIENT_SECRET || env.NEXT_PUBLIC_SHOPIFY_CLIENT_SECRET;

  if (!clientId) {
    throw new Error("Missing SHOPIFY_CLIENT_ID");
  }

  if (!clientSecret) {
    throw new Error("Missing SHOPIFY_CLIENT_SECRET");
  }

  const response = await fetch(`https://${getShop(env)}/admin/oauth/access_token`, {
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
  const response = await fetch(
    `https://${getShop(env)}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
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

function getDateDaysAgo(days: number) {
  return getBusinessDateDaysAgo(days);
}

function shouldCountLineItem(
  order: ShopifyOrdersResponse["orders"]["edges"][number]["node"],
  product: { productType: string; status: string } | undefined
) {
  return (
    !order.cancelledAt &&
    COUNTED_FINANCIAL_STATUSES.has(order.displayFinancialStatus) &&
    product?.status === "ACTIVE" &&
    INCLUDED_PRODUCT_TYPES.has(product.productType)
  );
}

async function getSalesSummaries(env: EnvMap, accessToken: string) {
  const salesBySku = new Map<string, number>();
  const sinceDate = getDateDaysAgo(90);
  const query = `created_at:>=${sinceDate}`;

  let cursor: string | null = null;
  let hasNextPage = true;
  let orderCount = 0;

  while (hasNextPage) {
    const data: ShopifyOrdersResponse =
      await shopifyGraphQL<ShopifyOrdersResponse>(
      env,
      accessToken,
      ORDERS_QUERY,
      { cursor, query }
    );

    for (const edge of data.orders.edges) {
      orderCount += 1;
      const order = edge.node;

      for (const lineItemEdge of order.lineItems.edges) {
        const lineItem = lineItemEdge.node;
        const sku = lineItem.sku?.trim();
        const product = lineItem.variant?.product;

        if (!sku || !shouldCountLineItem(order, product)) {
          continue;
        }

        const quantity = lineItem.currentQuantity ?? lineItem.quantity;
        salesBySku.set(sku, (salesBySku.get(sku) ?? 0) + quantity);
      }
    }

    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;
  }

  const sales: SalesSummary[] = Array.from(salesBySku.entries()).map(
    ([sku, quantity]) => ({ sku, quantity })
  );

  return {
    sinceDate,
    throughDate: getBusinessDateString(),
    orderCount,
    sales,
  };
}

export async function GET(request: Request) {
  try {
    const refresh = new URL(request.url).searchParams.get("refresh") === "1";

    if (!refresh && salesCache && salesCache.expiresAt > Date.now()) {
      return NextResponse.json({
        ...salesCache.data,
        cached: true,
      });
    }

    const env = await getEnvMap();
    const accessToken = await getShopifyAccessToken(env);
    const summary = await getSalesSummaries(env, accessToken);
    salesCache = {
      expiresAt: Date.now() + SALES_CACHE_TTL_MS,
      data: summary,
    };

    return NextResponse.json({
      ...summary,
      cached: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Shopify sales error";

    return NextResponse.json(
      {
        error: message,
        sales: [],
      },
      { status: 500 }
    );
  }
}
