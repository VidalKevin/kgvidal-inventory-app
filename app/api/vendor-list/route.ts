import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VENDOR_COLUMNS = `
  id,
  mfg,
  code,
  lead_time,
  review_period,
  order_at,
  link,
  username,
  password,
  contact,
  email,
  phone,
  settings
`;

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("vendor_list")
    .select(VENDOR_COLUMNS)
    .order("mfg", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: `Supabase vendor fetch failed: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ vendors: data ?? [] });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const payload = {
      mfg: body.mfg ?? "",
      code: body.code ?? "",
      lead_time: body.lead_time ?? "",
      review_period: body.review_period ?? "",
      order_at: body.order_at ?? "",
      link: body.link ?? "",
      username: body.username ?? "",
      password: body.password ?? "",
      contact: body.contact ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",
      settings: body.settings ?? null,
    };

    const { data, error } = await supabaseAdmin
      .from("vendor_list")
      .insert(payload)
      .select(VENDOR_COLUMNS)
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Supabase vendor insert failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ vendor: data });
  } catch {
    return NextResponse.json(
      { error: "Unable to add vendor." },
      { status: 500 }
    );
  }
}