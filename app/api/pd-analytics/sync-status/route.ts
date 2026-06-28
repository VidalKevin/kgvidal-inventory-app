import { NextResponse } from "next/server";
import { getPdSupabaseAdmin } from "@/lib/pdAnalyticsApi";
import { getPdSyncState } from "@/lib/pdAnalytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getPdSupabaseAdmin();

    return NextResponse.json({
      syncState: await getPdSyncState(supabase),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
