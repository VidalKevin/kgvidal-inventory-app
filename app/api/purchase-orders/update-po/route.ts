import { NextRequest, NextResponse } from "next/server";

// Import the shared store — since Next.js bundles each route separately, we keep
// a local mirror here and delegate to the actual store in the parent route file
// by re-exporting the same in-memory array. For demo purposes we just return
// success with the submitted rows.

type PurchaseOrderRow = {
  id?: string;
  date?: string;
  mfg?: string;
  product_title?: string;
  variant_title?: string;
  sku?: string;
  qty?: number;
  qty_received?: number | null;
  diff?: number | null;
  po_number?: string;
  status?: string;
  updated_at?: string;
};

const receivingStatuses = ["Received", "Under Received", "Over Received"];

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isBlank(value: unknown) {
  return value === null || value === undefined || value === "";
}

function getDiff(qty: number, qtyReceived: unknown) {
  if (isBlank(qtyReceived)) return null;
  return toNumber(qtyReceived) - qty;
}

function getStatus(qty: number, qtyReceived: unknown, fallback: string) {
  if (isBlank(qtyReceived)) return fallback || "Pending";
  const received = toNumber(qtyReceived);
  if (received === qty) return "Received";
  if (received < qty) return "Under Received";
  if (received > qty) return "Over Received";
  return fallback || "Pending";
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const rows: PurchaseOrderRow[] = Array.isArray(body.rows) ? body.rows : [];
    const poNumber = String(body.poNumber || rows[0]?.po_number || "").trim();

    if (!poNumber) {
      return NextResponse.json({ error: "Missing PO number." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updatedRows = [];

    for (const row of rows) {
      const qty = toNumber(row.qty);
      const qtyReceived = isBlank(row.qty_received) ? null : toNumber(row.qty_received);

      if (receivingStatuses.includes(String(row.status || "")) && !qty) {
        return NextResponse.json(
          { error: `Qty is blank. Cannot update receiving status for ${row.product_title || "row"}.` },
          { status: 400 }
        );
      }

      const finalStatus = receivingStatuses.includes(String(row.status || ""))
        ? getStatus(qty, row.qty_received, row.status ?? "Pending")
        : row.status || "Pending";

      updatedRows.push({
        id: row.id ?? `po-updated-${Date.now()}`,
        date: row.date ?? now.slice(0, 10),
        mfg: row.mfg ?? "",
        product_title: row.product_title ?? "",
        variant_title: row.variant_title ?? "",
        sku: row.sku ?? "",
        qty,
        qty_received: qtyReceived,
        diff: getDiff(qty, row.qty_received),
        po_number: poNumber,
        status: finalStatus,
        updated_at: now,
      });
    }

    return NextResponse.json({
      purchaseOrders: updatedRows,
      results: updatedRows.map((row) => ({ status: "Updated successfully", row })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error while saving." },
      { status: 500 }
    );
  }
}
