import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs";

type EnvMap = Record<string, string | undefined>;

type ItemMasterPayload = {
  product_title?: string;
  product_variant_title?: string;
  product_variant_sku?: string;
  product_vendor?: string;
  uom?: string;
};

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

function requireText(payload: ItemMasterPayload, key: keyof ItemMasterPayload) {
  const value = payload[key]?.trim();

  if (!value) {
    throw new Error(`Missing ${key}`);
  }

  return value;
}

export async function GET() {
  try {
    const env = await getEnvMap();
    const supabaseAdmin = getSupabaseAdmin(env);
    const { data, error } = await supabaseAdmin
      .from("item_master_list")
      .select(
        "id, product_title, product_variant_title, product_variant_sku, product_vendor, uom"
      )
      .order("product_title", { ascending: true });

    if (error) {
      throw new Error(`Supabase item fetch failed: ${error.message}`);
    }

    return NextResponse.json({
      items: data ?? [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown item master fetch error";

    return NextResponse.json(
      {
        error: message,
        items: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ItemMasterPayload;
    const row = {
      product_title: requireText(payload, "product_title"),
      product_variant_title: requireText(payload, "product_variant_title"),
      product_variant_sku: requireText(payload, "product_variant_sku"),
      product_vendor: requireText(payload, "product_vendor"),
      uom: requireText(payload, "uom"),
    };

    const env = await getEnvMap();
    const supabaseAdmin = getSupabaseAdmin(env);
    const { data, error } = await supabaseAdmin
      .from("item_master_list")
      .insert(row)
      .select(
        "id, product_title, product_variant_title, product_variant_sku, product_vendor, uom"
      )
      .single();

    if (error) {
      throw new Error(`Supabase item insert failed: ${error.message}`);
    }

    return NextResponse.json({
      item: data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown item master insert error";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 400 }
    );
  }
}
