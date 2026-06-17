import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return NextResponse.json({ purchaseOrder: { id, note: "Demo mode." } });
}

export async function PUT(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return NextResponse.json({ purchaseOrder: { id, note: "Demo mode – update simulated." } });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return NextResponse.json({ success: true, id, note: "Demo mode – delete simulated." });
}
