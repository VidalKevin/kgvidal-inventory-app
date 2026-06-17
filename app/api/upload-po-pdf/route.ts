import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { poNumber?: string; pdfBase64?: string };
    const { poNumber } = body;

    if (!poNumber) {
      return NextResponse.json({ error: "Missing poNumber." }, { status: 400 });
    }

    // Demo mode: simulate a successful PDF upload without actual storage
    const filename = `${poNumber}.pdf`;
    console.log("[DEMO] PDF upload simulated:", filename);

    return NextResponse.json({ success: true, filename });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 }
    );
  }
}
