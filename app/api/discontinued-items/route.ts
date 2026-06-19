import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs";

type EnvMap = Record<string, string | undefined>;

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

export async function GET() {
  try {
    const env = await getEnvMap();
    const supabaseAdmin = getSupabaseAdmin(env);
    const { data, error } = await supabaseAdmin
      .from("discontinued_items")
      .select("id, product_name, vendor, sku, replace_with, status")
      .order("vendor", { ascending: true })
      .order("product_name", { ascending: true });

    if (error) {
      throw new Error(`Supabase discontinued items fetch failed: ${error.message}`);
    }

    return NextResponse.json({
      items: data ?? [],
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown discontinued items fetch error";

    return NextResponse.json(
      {
        error: message,
        items: [],
      },
      { status: 500 }
    );
  }
}
