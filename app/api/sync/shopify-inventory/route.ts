import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ShopifyTokenResponse = {
  access_token: string;
  scope: string;
  expires_in: number;
};

type InventoryRow = {
  snapshot_date: string;
  product_title: string;
  variant_title: string;
  product_sku: string;
  quantity: number;
};

type ShopifyInventoryResponse = {
  productVariants: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    edges: Array<{
      node: {
        title: string;
        sku: string | null;
        product: {
          title: string;
        };
        inventoryItem: {
          inventoryLevels: {
            edges: Array<{
              node: {
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

const SHOPIFY_API_VERSION = "2026-04";

const INVENTORY_QUERY = `
  query InventorySync($cursor: String) {
    productVariants(first: 100, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          title
          sku
          product {
            title
          }
          inventoryItem {
            inventoryLevels(first: 20) {
              edges {
                node {
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

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

function getSupabaseAdmin() {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function getShopifyAccessToken() {
  const shop = getRequiredEnv("SHOPIFY_STORE_DOMAIN");
  const clientId = getRequiredEnv("SHOPIFY_CLIENT_ID");
  const clientSecret = getRequiredEnv("SHOPIFY_CLIENT_SECRET");

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
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {}
) {
  const shop = getRequiredEnv("SHOPIFY_STORE_DOMAIN");

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

async function getInventoryRows(accessToken: string) {
  const snapshotDate = new Date().toISOString().slice(0, 10);
  const rows: InventoryRow[] = [];

  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data: ShopifyInventoryResponse =
  await shopifyGraphQL<ShopifyInventoryResponse>(
    accessToken,
    INVENTORY_QUERY,
    { cursor }
  );

    for (const edge of data.productVariants.edges) {
      const variant = edge.node;

      if (!variant.sku) {
        continue;
      }

      const quantity =
        variant.inventoryItem?.inventoryLevels.edges.reduce((total, level) => {
          const available =
            level.node.quantities.find((item) => item.name === "available")
              ?.quantity ?? 0;

          return total + available;
        }, 0) ?? 0;

      rows.push({
        snapshot_date: snapshotDate,
        product_title: variant.product.title,
        variant_title: variant.title,
        product_sku: variant.sku,
        quantity,
      });
    }

    hasNextPage = data.productVariants.pageInfo.hasNextPage;
    cursor = data.productVariants.pageInfo.endCursor;
  }

  return rows;
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const accessToken = await getShopifyAccessToken();
    const rows = await getInventoryRows(accessToken);

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        inserted: 0,
        message: "No Shopify inventory rows found.",
      });
    }

    const { error } = await supabaseAdmin
      .from("shopify_inventory_snapshots")
      .insert(rows);

    if (error) {
      throw new Error(`Supabase insert failed: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      inserted: rows.length,
      snapshotDate: rows[0]?.snapshot_date,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sync error";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
