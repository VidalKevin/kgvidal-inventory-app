import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/authServer";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({ user: session });
}

