import { NextResponse } from "next/server";

const mockDiscontinuedItems = [
  {
    id: "disc-1",
    sku: "ALPHA-OLD-1",
    product_title: "Original Formula Protein",
    variant_title: "Strawberry",
    vendor: "Alpha Nutrition",
    discontinued_at: "2025-12-01",
  },
  {
    id: "disc-2",
    sku: "BCLAB-OLD-1",
    product_title: "Iron Complex",
    variant_title: "Default Title",
    vendor: "BioCore Labs",
    discontinued_at: "2026-01-15",
  },
  {
    id: "disc-3",
    sku: "PEAK-OLD-1",
    product_title: "Classic Pre-Workout",
    variant_title: "Citrus",
    vendor: "PeakForm Supplies",
    discontinued_at: "2026-02-28",
  },
];

export async function GET() {
  return NextResponse.json({ items: mockDiscontinuedItems });
}
