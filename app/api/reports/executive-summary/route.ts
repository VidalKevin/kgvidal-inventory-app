import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs";

type EnvMap = Record<string, string | undefined>;

type ShopifyTokenResponse = {
  access_token: string;
};

type MoneySet = {
  shopMoney: {
    amount: string;
  };
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
        currentSubtotalPriceSet: MoneySet;
        currentTotalDiscountsSet: MoneySet;
        currentTotalPriceSet: MoneySet;
        shippingAddress: {
          countryCodeV2: string | null;
        } | null;
        lineItems: {
          edges: Array<{
            node: {
              quantity: number;
              currentQuantity: number;
              originalTotalSet: MoneySet;
              discountedTotalSet: MoneySet;
              variant: {
                product: {
                  productType: string;
                };
              } | null;
            };
          }>;
        };
      };
    }>;
  };
};

type SummaryMetrics = {
  totalSales: number;
  shopifyTotal: number;
  suppOnlySales: number;
  shopifyLabs: number;
  internationalSales: number;
  aveOrder: number;
  totalOrders: number;
  totalNet: number;
};

const SHOPIFY_API_VERSION = "2026-04";
const SUPPLEMENT_PRODUCT_TYPES = new Set(["nutraceutical", "nutraceuticals"]);
const LAB_PRODUCT_TYPES = new Set(["lab test public"]);

const ORDERS_QUERY = `
  query ExecutiveSummaryOrders($cursor: String, $query: String!) {
    orders(first: 50, after: $cursor, query: $query, sortKey: CREATED_AT) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          cancelledAt
          displayFinancialStatus
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
          currentTotalPriceSet {
            shopMoney {
              amount
            }
          }
          shippingAddress {
            countryCodeV2
          }
          lineItems(first: 100) {
            edges {
              node {
                quantity
                currentQuantity
                originalTotalSet {
                  shopMoney {
                    amount
                  }
                }
                discountedTotalSet {
                  shopMoney {
                    amount
                  }
                }
                variant {
                  product {
                    productType
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
  variables: Record<string, unknown>
): Promise<T> {
  const response = await fetch(
    `https://${getShop(env)}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
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

function parseDateInput(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function sameRangeLastYear(startDate: Date, endDate: Date) {
  const previousStart = new Date(startDate);
  const previousEnd = new Date(endDate);

  previousStart.setFullYear(previousStart.getFullYear() - 1);
  previousEnd.setFullYear(previousEnd.getFullYear() - 1);

  return {
    startDate: previousStart,
    endDate: previousEnd,
  };
}

function dateRangeQuery(startDate: string, endDate: string) {
  const nextDay = parseDateInput(endDate);

  if (!nextDay) {
    return `created_at:>=${startDate} created_at:<=${endDate}`;
  }

  nextDay.setDate(nextDay.getDate() + 1);

  return `created_at:>=${startDate} created_at:<${toDateInputValue(nextDay)}`;
}

function moneyValue(moneySet: MoneySet | null | undefined) {
  return Number(moneySet?.shopMoney.amount ?? 0) || 0;
}

function isCountedOrder(
  order: ShopifyOrdersResponse["orders"]["edges"][number]["node"]
) {
  return !order.cancelledAt;
}

function lineQuantity(lineItem: {
  quantity: number;
  currentQuantity: number;
}) {
  return lineItem.currentQuantity ?? lineItem.quantity ?? 0;
}

async function fetchSummaryMetrics(
  env: EnvMap,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<SummaryMetrics> {
  const metrics: SummaryMetrics = {
    totalSales: 0,
    shopifyTotal: 0,
    suppOnlySales: 0,
    shopifyLabs: 0,
    internationalSales: 0,
    aveOrder: 0,
    totalOrders: 0,
    totalNet: 0,
  };

  let cursor: string | null = null;
  let hasNextPage = true;
  let grossMinusDiscounts = 0;

  while (hasNextPage) {
    const data: ShopifyOrdersResponse = await shopifyGraphQL<ShopifyOrdersResponse>(
      env,
      accessToken,
      ORDERS_QUERY,
      {
        cursor,
        query: dateRangeQuery(startDate, endDate),
      }
    );

    for (const edge of data.orders.edges) {
      const order = edge.node;

      if (!isCountedOrder(order)) {
        continue;
      }

      metrics.totalOrders += 1;
      metrics.totalSales += moneyValue(order.currentTotalPriceSet);
      metrics.totalNet += moneyValue(order.currentSubtotalPriceSet);
      const isInternational =
        order.shippingAddress?.countryCodeV2 &&
        order.shippingAddress.countryCodeV2 !== "US";
      let orderGross = 0;

      for (const lineItemEdge of order.lineItems.edges) {
        const lineItem = lineItemEdge.node;
        const originalTotal = moneyValue(lineItem.originalTotalSet);
        const productType =
          lineItem.variant?.product.productType.trim().toLowerCase() ?? "";

        if (lineQuantity(lineItem) <= 0) {
          continue;
        }

        orderGross += originalTotal;
        metrics.shopifyTotal += originalTotal;

        if (SUPPLEMENT_PRODUCT_TYPES.has(productType)) {
          metrics.suppOnlySales += originalTotal;
        }

        if (LAB_PRODUCT_TYPES.has(productType)) {
          metrics.shopifyLabs += originalTotal;
        }

        if (isInternational) {
          metrics.internationalSales += originalTotal;
        }
      }

      grossMinusDiscounts += Math.max(
        orderGross - moneyValue(order.currentTotalDiscountsSet),
        0
      );
    }

    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;
  }

  metrics.aveOrder =
    metrics.totalOrders > 0 ? grossMinusDiscounts / metrics.totalOrders : 0;

  return metrics;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = parseDateInput(searchParams.get("startDate"));
    const endDate = parseDateInput(searchParams.get("endDate"));

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required." },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date." },
        { status: 400 }
      );
    }

    const env = await getEnvMap();
    const accessToken = await getShopifyAccessToken(env);
    const currentRange = {
      startDate: toDateInputValue(startDate),
      endDate: toDateInputValue(endDate),
    };
    const previousRangeDates = sameRangeLastYear(startDate, endDate);
    const previousRange = {
      startDate: toDateInputValue(previousRangeDates.startDate),
      endDate: toDateInputValue(previousRangeDates.endDate),
    };
    const [current, previous] = await Promise.all([
      fetchSummaryMetrics(
        env,
        accessToken,
        currentRange.startDate,
        currentRange.endDate
      ),
      fetchSummaryMetrics(
        env,
        accessToken,
        previousRange.startDate,
        previousRange.endDate
      ),
    ]);

    return NextResponse.json({
      current,
      previous,
      currentRange,
      previousRange,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
