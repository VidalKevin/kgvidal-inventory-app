import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const PURCHASE_ORDER_COLUMNS = `
  id,
  date,
  mfg,
  product_title,
  variant_title,
  sku,
  qty,
  qty_received,
  diff,
  po_number,
  status,
  created_at,
  updated_at
`;

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
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const originalPoNumber = String(body.originalPoNumber || body.poNumber || "").trim();
    const poNumber = String(body.poNumber || rows[0]?.po_number || "").trim();

    if (!poNumber) {
      return NextResponse.json(
        { error: "Missing PO number." },
        { status: 400 }
      );
    }

    const payload = [];

    for (const row of rows) {
      const qty = toNumber(row.qty);
      const qtyReceivedIsBlank = isBlank(row.qty_received);
      const qtyReceived = qtyReceivedIsBlank ? null : toNumber(row.qty_received);

      if (receivingStatuses.includes(String(row.status || "")) && !qty) {
        return NextResponse.json(
          {
            error: `Qty is blank. Cannot update receiving status for ${
              row.product_title || "row"
            }.`,
          },
          { status: 400 }
        );
      }

      const finalStatus = receivingStatuses.includes(String(row.status || ""))
        ? getStatus(qty, row.qty_received, row.status)
        : row.status || "Pending";

      payload.push({
        date: row.date,
        mfg: row.mfg,
        product_title: row.product_title,
        variant_title: row.variant_title || "",
        sku: row.sku,
        qty,
        qty_received: qtyReceived,
        diff: getDiff(qty, row.qty_received),
        po_number: poNumber,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("purchase_orders")
      .delete()
      .eq("po_number", originalPoNumber || poNumber);

    if (deleteError) {
      return NextResponse.json(
        { error: `Error while replacing PO: ${deleteError.message}` },
        { status: 500 }
      );
    }

    if (!payload.length) {
      return NextResponse.json({ purchaseOrders: [], results: [] });
    }

    const { data, error } = await supabaseAdmin
      .from("purchase_orders")
      .insert(payload)
      .select(PURCHASE_ORDER_COLUMNS);

    if (error) {
      return NextResponse.json(
        { error: `Error while saving: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      purchaseOrders: data ?? [],
      results: (data ?? []).map((row) => ({
        status: "Updated successfully",
        row,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error while saving.",
      },
      { status: 500 }
    );
  }
}
