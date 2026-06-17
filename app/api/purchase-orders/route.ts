import { NextRequest, NextResponse } from "next/server";

type PurchaseOrderRow = {
  id: string;
  date: string;
  mfg: string;
  product_title: string;
  variant_title: string;
  sku: string;
  qty: number;
  qty_received: number;
  diff: number;
  po_number: string;
  status: string;
  created_at: string;
  updated_at: string;
};

// Seed sample purchase orders
const purchaseOrderStore: PurchaseOrderRow[] = [
  {
    id: "po-1a",
    date: "2026-06-10",
    mfg: "Alpha Nutrition",
    product_title: "Protein Powder",
    variant_title: "Chocolate",
    sku: "ALPHA-001",
    qty: 200,
    qty_received: 0,
    diff: 0,
    po_number: "ALPHA 06.10.26",
    status: "Sent",
    created_at: "2026-06-10T09:00:00Z",
    updated_at: "2026-06-10T09:00:00Z",
  },
  {
    id: "po-1b",
    date: "2026-06-10",
    mfg: "Alpha Nutrition",
    product_title: "Vitamin C 1000mg",
    variant_title: "Default Title",
    sku: "ALPHA-003",
    qty: 100,
    qty_received: 0,
    diff: 0,
    po_number: "ALPHA 06.10.26",
    status: "Sent",
    created_at: "2026-06-10T09:00:00Z",
    updated_at: "2026-06-10T09:00:00Z",
  },
  {
    id: "po-2a",
    date: "2026-06-03",
    mfg: "Summit Health Co",
    product_title: "Elderberry Extract",
    variant_title: "120ml",
    sku: "SMTH-003",
    qty: 120,
    qty_received: 120,
    diff: 0,
    po_number: "SMTH 06.03.26",
    status: "Received",
    created_at: "2026-06-03T10:00:00Z",
    updated_at: "2026-06-12T14:00:00Z",
  },
  {
    id: "po-2b",
    date: "2026-06-03",
    mfg: "Summit Health Co",
    product_title: "Probiotic Complex",
    variant_title: "60cap",
    sku: "SMTH-002",
    qty: 80,
    qty_received: 75,
    diff: -5,
    po_number: "SMTH 06.03.26",
    status: "Under Received",
    created_at: "2026-06-03T10:00:00Z",
    updated_at: "2026-06-12T14:00:00Z",
  },
];

export async function GET() {
  const sorted = [...purchaseOrderStore].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.created_at.localeCompare(a.created_at);
  });
  return NextResponse.json({ purchaseOrders: sorted });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rows: Array<{
      date?: string;
      mfg?: string;
      product_title?: string;
      variant_title?: string;
      sku?: string;
      qty?: number;
      qty_received?: number;
      diff?: number;
      po_number?: string;
      status?: string;
    }> =
      "items" in body && Array.isArray(body.items) ? body.items : [body];

    const validRows = rows.filter((row) => Number(row.qty ?? 0) > 0);
    if (!validRows.length) {
      return NextResponse.json({ error: "No approved PO rows to save." }, { status: 400 });
    }

    const poNumbers = Array.from(new Set(validRows.map((r) => r.po_number).filter(Boolean)));
    const updatedExisting = poNumbers.some((pn) =>
      purchaseOrderStore.some((r) => r.po_number === pn)
    );

    // Remove existing rows for the same PO numbers
    for (const pn of poNumbers) {
      const idx = purchaseOrderStore.findIndex((r) => r.po_number === pn);
      while (idx !== -1) {
        purchaseOrderStore.splice(
          purchaseOrderStore.findIndex((r) => r.po_number === pn),
          1
        );
        if (!purchaseOrderStore.some((r) => r.po_number === pn)) break;
      }
    }

    const now = new Date().toISOString();
    const newRows: PurchaseOrderRow[] = validRows.map((row, i) => ({
      id: `po-new-${Date.now()}-${i}`,
      date: row.date ?? now.slice(0, 10),
      mfg: row.mfg ?? "",
      product_title: row.product_title ?? "",
      variant_title: row.variant_title ?? "",
      sku: row.sku ?? "",
      qty: Number(row.qty ?? 0),
      qty_received: Number(row.qty_received ?? 0),
      diff: Number(row.diff ?? 0),
      po_number: row.po_number ?? "",
      status: row.status ?? "Pending",
      created_at: now,
      updated_at: now,
    }));

    purchaseOrderStore.push(...newRows);

    return NextResponse.json({ purchaseOrders: newRows, updatedExisting });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create purchase order." },
      { status: 500 }
    );
  }
}
