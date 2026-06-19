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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function cleanValue(value: unknown) {
  return decodeURIComponent(String(value || "").trim());
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseCompositeLookup(value: string) {
  const parts = value.split("__");

  if (parts.length < 2) return null;

  return {
    po_number: cleanValue(parts[0]),
    product_title: cleanValue(parts[1]),
    variant_title: cleanValue(parts[2] || ""),
  };
}

async function findPurchaseOrder(rawId: string) {
  const id = cleanValue(rawId);

  if (!id || id === "undefined") {
    return { data: null, error: "Missing purchase order ID." };
  }

  if (isUuid(id)) {
    const { data, error } = await supabaseAdmin
      .from("purchase_orders")
      .select(PURCHASE_ORDER_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    return { data, error: error?.message || null };
  }

  const composite = parseCompositeLookup(id);

  if (composite) {
    let query = supabaseAdmin
      .from("purchase_orders")
      .select(PURCHASE_ORDER_COLUMNS)
      .eq("po_number", composite.po_number)
      .eq("product_title", composite.product_title);

    if (composite.variant_title) {
      query = query.eq("variant_title", composite.variant_title);
    } else {
      query = query.or("variant_title.is.null,variant_title.eq.");
    }

    const { data, error } = await query.maybeSingle();
    return { data, error: error?.message || null };
  }

  const { data, error } = await supabaseAdmin
    .from("purchase_orders")
    .select(PURCHASE_ORDER_COLUMNS)
    .eq("po_number", id)
    .maybeSingle();

  return { data, error: error?.message || null };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const result = await findPurchaseOrder(id);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  if (!result.data) {
    return NextResponse.json(
      {
        error: "Purchase order line not found.",
        lookup: id,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ purchaseOrder: result.data });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existing = await findPurchaseOrder(id);

    if (existing.error) {
      return NextResponse.json({ error: existing.error }, { status: 500 });
    }

    if (!existing.data) {
      return NextResponse.json(
        {
          error: "Purchase order line not found.",
          lookup: id,
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    const qty = toNumber(body.qty);
    const qtyReceived = toNumber(body.qty_received);

    if (
      ["Received", "Under Received", "Over Received"].includes(
        String(body.status || "")
      ) &&
      !qty
    ) {
      return NextResponse.json(
        { error: "Qty is blank. Cannot mark this line as received." },
        { status: 400 }
      );
    }

    if (qtyReceived > 0 && !qty) {
      return NextResponse.json(
        { error: "Qty is blank. Cannot update Qty Received." },
        { status: 400 }
      );
    }

    const payload = {
      date: body.date,
      mfg: body.mfg,
      product_title: body.product_title,
      variant_title: body.variant_title,
      sku: body.sku,
      qty,
      qty_received: qtyReceived,
      diff: qty - qtyReceived,
      po_number: body.po_number,
      status: body.status,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("purchase_orders")
      .update(payload)
      .eq("id", existing.data.id)
      .select(PURCHASE_ORDER_COLUMNS)
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Supabase purchase order update failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ purchaseOrder: data });
  } catch {
    return NextResponse.json(
      { error: "Unable to update purchase order." },
      { status: 500 }
    );
  }
}