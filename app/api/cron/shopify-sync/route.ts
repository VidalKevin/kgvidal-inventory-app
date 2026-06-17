import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  console.log("[DEMO] Cron shopify-sync triggered – no real sync performed.");
  return NextResponse.json({ success: true, note: "Demo mode." });
}
