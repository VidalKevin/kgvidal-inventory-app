import { NextResponse } from "next/server";

// Demo mode: return sample 90-day sales data matching mock inventory
export async function GET() {
  const sales = [
    { sku: "ALPHA-001", quantity: 320 },
    { sku: "ALPHA-002", quantity: 280 },
    { sku: "ALPHA-003", quantity: 190 },
    { sku: "BCLAB-001", quantity: 150 },
    { sku: "BCLAB-002", quantity: 210 },
    { sku: "BCLAB-003", quantity: 140 },
    { sku: "SMTH-001",  quantity: 260 },
    { sku: "SMTH-002",  quantity: 180 },
    { sku: "SMTH-003",  quantity: 120 },
    { sku: "PEAK-001",  quantity: 300 },
    { sku: "PEAK-002",  quantity: 200 },
    { sku: "PEAK-003",  quantity: 160 },
    { sku: "NOVA-001",  quantity: 380 },
    { sku: "NOVA-002",  quantity: 220 },
    { sku: "NOVA-003",  quantity: 175 },
  ];

  return NextResponse.json({ sales });
}
