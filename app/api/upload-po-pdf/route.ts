import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

const BUCKET = "purchase-order-pdfs";

function escapeForRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(req: Request) {
  const body = (await req.json()) as { poNumber?: string; pdfBase64?: string };
  const { poNumber, pdfBase64 } = body;

  if (!poNumber || !pdfBase64) {
    return NextResponse.json({ error: "Missing poNumber or pdfBase64." }, { status: 400 });
  }

  // List all files in the bucket that start with this PO number
  const { data: files, error: listError } = await supabaseAdmin.storage
    .from(BUCKET)
    .list("", { limit: 200 });

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const existing = (files ?? []).filter((f) =>
    new RegExp(`^${escapeForRegex(poNumber)}(\\.\\d+)?\\.pdf$`).test(f.name)
  );

  let filename: string;
  if (existing.length === 0) {
    filename = `${poNumber}.pdf`;
  } else {
    // Find the highest version number already uploaded
    const versions = existing.map((f) => {
      const match = f.name.match(new RegExp(`^${escapeForRegex(poNumber)}(?:\\.(\\d+))?\\.pdf$`));
      if (!match) return -1;
      return match[1] !== undefined ? parseInt(match[1], 10) : 0;
    });
    const maxVersion = Math.max(...versions);
    filename = `${poNumber}.${maxVersion + 1}.pdf`;
  }

  const buffer = Buffer.from(pdfBase64, "base64");

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, filename });
}
