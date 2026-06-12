import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id || id === "undefined") {
      return NextResponse.json(
        { error: "Missing vendor ID." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("vendor_list")
      .select(VENDOR_COLUMNS)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Supabase vendor fetch failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ vendor: data });
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch vendor." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (!id || id === "undefined") {
      return NextResponse.json(
        { error: "Missing vendor ID." },
        { status: 400 }
      );
    }

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
      .update(payload)
      .eq("id", id)
      .select(VENDOR_COLUMNS)
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Supabase vendor update failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ vendor: data });
  } catch {
    return NextResponse.json(
      { error: "Unable to update vendor." },
      { status: 500 }
    );
  }
}