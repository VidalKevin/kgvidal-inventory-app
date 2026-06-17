import { NextResponse } from "next/server";

export const runtime = "nodejs";

const mockOnHoldOrders = [
  {
    id: 1001,
    order_date: "2026-06-15",
    order_number: "#10042",
    first_name: "Alex",
    email: "customer1@sample-email.com",
    on_hold: "Payment Review",
    synced_at: "2026-06-17T08:00:00Z",
  },
  {
    id: 1002,
    order_date: "2026-06-16",
    order_number: "#10058",
    first_name: "Jordan",
    email: "customer2@sample-email.com",
    on_hold: "Address Verification",
    synced_at: "2026-06-17T08:00:00Z",
  },
  {
    id: 1003,
    order_date: "2026-06-17",
    order_number: "#10071",
    first_name: "Morgan",
    email: "customer3@sample-email.com",
    on_hold: "Fraud Review",
    synced_at: "2026-06-17T08:00:00Z",
  },
];

export async function GET() {
  return NextResponse.json({
    orders: mockOnHoldOrders,
    syncedAt: "2026-06-17T08:00:00Z",
    note: "Demo mode.",
  });
}
