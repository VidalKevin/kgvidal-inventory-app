import { NextResponse } from "next/server";

type SendPoEmailPayload = {
  from?: string;
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  poNumber?: string;
  vendor?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    contentBase64: string;
  }>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SendPoEmailPayload;
    const to = String(body.to || "").trim();
    const subject = String(body.subject || "").trim();

    if (!to) {
      return NextResponse.json(
        { success: false, error: "Missing recipient email address." },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { success: false, error: "Missing email subject." },
        { status: 400 }
      );
    }

    // Demo mode: log the email details and return success without actually sending
    console.log("[DEMO] Email send simulated:", {
      from: body.from,
      to,
      subject,
      poNumber: body.poNumber,
      vendor: body.vendor,
      attachments: (body.attachments ?? []).map((a) => a.filename),
    });

    return NextResponse.json({
      success: true,
      messageId: `demo-msg-${Date.now()}`,
      note: "Demo mode: email was not actually sent.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to send email." },
      { status: 500 }
    );
  }
}
