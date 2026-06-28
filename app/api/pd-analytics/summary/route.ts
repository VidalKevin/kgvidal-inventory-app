import { NextResponse } from "next/server";
import { getPdSupabaseAdmin } from "@/lib/pdAnalyticsApi";
import {
  loadPdData,
  parsePdFilters,
  summarizePdData,
} from "@/lib/pdAnalytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const filters = parsePdFilters(new URL(request.url));
    const supabase = await getPdSupabaseAdmin();
    const orders = await loadPdData(supabase, filters);

    return NextResponse.json({
      filters,
      summary: summarizePdData(orders),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
