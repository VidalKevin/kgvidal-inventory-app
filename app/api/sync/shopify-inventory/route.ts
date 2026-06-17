import { NextResponse } from "next/server";

export async function GET() {
  // Demo mode: simulate a successful inventory sync without calling Shopify
  const snapshotDate = new Date().toISOString().slice(0, 10);

  console.log("[DEMO] Inventory sync simulated for date:", snapshotDate);

  return NextResponse.json({
    success: true,
    inserted: 15,
    forecastSaved: 15,
    snapshotDate,
    note: "Demo mode: no real sync was performed.",
  });
}
