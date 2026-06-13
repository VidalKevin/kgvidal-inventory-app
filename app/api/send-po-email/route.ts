import { google } from "googleapis";
import { NextResponse } from "next/server";

const OAuth2 = google.auth.OAuth2;

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

const oauth2Client = new OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

function cleanHeader(value: unknown) {
  return String(value || "")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function POST(req: Request) {
  try {
    if (
      !process.env.GMAIL_CLIENT_ID ||
      !process.env.GMAIL_CLIENT_SECRET ||
      !process.env.GMAIL_REFRESH_TOKEN
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Gmail sending is not configured. Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN.",
        },
        { status: 500 }
      );
    }

    const body = (await req.json()) as SendPoEmailPayload;
    const fromEmail =
      process.env.GMAIL_FROM_EMAIL || "kevingalang@vidalcoaching.com";
    const fromName = process.env.GMAIL_FROM_NAME || "Kevin Galang";
    const from = cleanHeader(body.from || `${fromName} <${fromEmail}>`);
    const to = cleanHeader(body.to);
    const subject = cleanHeader(
      body.subject || `Purchase Order ${body.poNumber || ""}`.trim()
    );
    const html = String(body.html || "").trim();
    const text = String(body.text || "").trim();
    const attachments = Array.isArray(body.attachments)
      ? body.attachments.filter(
          (attachment) =>
            attachment.filename &&
            attachment.contentType &&
            attachment.contentBase64
        )
      : [];

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

    if (!html && !text) {
      return NextResponse.json(
        { success: false, error: "Missing email body." },
        { status: 400 }
      );
    }

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    const htmlBody = html || text.replace(/\n/g, "<br/>");
    const messageParts = [`From: ${from}`, `To: ${to}`, `Subject: ${subject}`];

    if (attachments.length > 0) {
      const boundary = `po_boundary_${Date.now()}`;

      messageParts.push(
        "MIME-Version: 1.0",
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: 7bit",
        "",
        htmlBody
      );

      attachments.forEach((attachment) => {
        messageParts.push(
          "",
          `--${boundary}`,
          `Content-Type: ${attachment.contentType}; name="${cleanHeader(attachment.filename)}"`,
          "Content-Transfer-Encoding: base64",
          `Content-Disposition: attachment; filename="${cleanHeader(attachment.filename)}"`,
          "",
          attachment.contentBase64.replace(/(.{76})/g, "$1\n")
        );
      });

      messageParts.push("", `--${boundary}--`);
    } else {
      messageParts.push(
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "",
        htmlBody
      );
    }

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodeBase64Url(messageParts.join("\n")),
      },
    });

    return NextResponse.json({
      success: true,
      messageId: response.data.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send PO email.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
