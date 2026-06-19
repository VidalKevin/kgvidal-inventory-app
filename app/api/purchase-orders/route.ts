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

type PurchaseOrderPayloadRow = {
  date?: string;
  mfg?: string;
  vendor?: string;
  product_title?: string;
  productTitle?: string;
  variant_title?: string;
  variantTitle?: string;
  sku?: string;
  qty?: number | string;
  amountApproved?: number | string;
  qty_received?: number | string;
  diff?: number | string;
  po_number?: string;
  poNumber?: string;
  status?: string;
};

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("purchase_orders")
    .select(PURCHASE_ORDER_COLUMNS)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `Supabase purchase order fetch failed: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ purchaseOrders: data ?? [] });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as
      | PurchaseOrderPayloadRow
      | { items?: PurchaseOrderPayloadRow[] };
    const rows: PurchaseOrderPayloadRow[] =
      "items" in body && Array.isArray(body.items)
        ? body.items
        : [body as PurchaseOrderPayloadRow];

    const payload = rows
      .filter((row) => Number(row.qty ?? row.amountApproved ?? 0) > 0)
      .map((row) => ({
        date: row.date,
        mfg: row.mfg ?? row.vendor ?? "",
        product_title: row.product_title ?? row.productTitle ?? "",
        variant_title: row.variant_title ?? row.variantTitle ?? "",
        sku: row.sku ?? "",
        qty: Number(row.qty ?? row.amountApproved ?? 0),
        qty_received: Number(row.qty_received ?? 0),
        diff: Number(row.diff ?? 0),
        po_number: row.po_number ?? row.poNumber ?? "",
        status: row.status ?? "Pending",
      }));

    if (!payload.length) {
      return NextResponse.json(
        { error: "No approved PO rows to save." },
        { status: 400 }
      );
    }

    const poNumbers = Array.from(
      new Set(payload.map((row) => row.po_number).filter(Boolean))
    );

    if (poNumbers.length) {
      const { error: deleteError } = await supabaseAdmin
        .from("purchase_orders")
        .delete()
        .in("po_number", poNumbers);

      if (deleteError) {
        return NextResponse.json(
          {
            error: `Supabase purchase order replace failed: ${deleteError.message}`,
          },
          { status: 500 }
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from("purchase_orders")
      .insert(payload)
      .select(PURCHASE_ORDER_COLUMNS);

    if (error) {
      return NextResponse.json(
        { error: `Supabase purchase order insert failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ purchaseOrders: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create purchase order.",
      },
      { status: 500 }
    );
  }
}
