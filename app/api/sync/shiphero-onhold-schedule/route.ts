import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  fetchShipheroOnholdSchedule,
  saveShipheroOnholdSchedule,
} from "@/lib/shipheroOnholdSchedule";
import { getSupabaseAdminFromEnv, type EnvMap } from "@/lib/supabaseEnv";

export const runtime = "nodejs";

type SchedulePayload = {
  time?: string;
  frequency?: "daily" | "weekly" | "custom";
  days?: string[];
  enabled?: boolean;
};

async function getEnvMap(): Promise<EnvMap> {
  try {
    const context = await getCloudflareContext({ async: true });
    return { ...process.env, ...(context.env as EnvMap) };
  } catch {
    return process.env;
  }
}

export async function GET() {
  try {
    const env = await getEnvMap();
    const supabaseAdmin = getSupabaseAdminFromEnv(env);
    const schedule = await fetchShipheroOnholdSchedule(supabaseAdmin);

    return NextResponse.json({ schedule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SchedulePayload;
    const env = await getEnvMap();
    const supabaseAdmin = getSupabaseAdminFromEnv(env);
    const current = await fetchShipheroOnholdSchedule(supabaseAdmin);
    const schedule = await saveShipheroOnholdSchedule(supabaseAdmin, {
      ...current,
      ...payload,
      last_run_key: current.last_run_key,
      last_run_at: current.last_run_at,
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
