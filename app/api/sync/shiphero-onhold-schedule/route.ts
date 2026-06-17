import { NextResponse } from "next/server";

type SchedulePayload = {
  time?: string;
  frequency?: "daily" | "weekly" | "custom";
  days?: string[];
  enabled?: boolean;
};

let savedSchedule: SchedulePayload = {
  time: "08:00",
  frequency: "weekly",
  days: ["M"],
  enabled: true,
};

export async function GET() {
  return NextResponse.json({ schedule: savedSchedule });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SchedulePayload;
    savedSchedule = { ...savedSchedule, ...payload };
    return NextResponse.json({ schedule: savedSchedule });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save schedule." },
      { status: 400 }
    );
  }
}
