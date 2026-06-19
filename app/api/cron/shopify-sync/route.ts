import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  checkShopifySyncSchedule,
  fetchShopifySyncSchedule,
  markShopifySyncScheduleRun,
} from "@/lib/shopifySyncSchedule";
import { getSupabaseAdminFromEnv, type EnvMap } from "@/lib/supabaseEnv";

export const runtime = "nodejs";

type SyncResult = {
  success: boolean;
  inserted?: number;
  forecastSaved?: number;
  usedForecastColumns?: boolean;
  snapshotDate?: string;
  error?: string;
  message?: string;
};

async function getEnvMap(): Promise<EnvMap> {
  try {
    const context = await getCloudflareContext({ async: true });
    return {
      ...process.env,
      ...(context.env as EnvMap),
    };
  } catch {
    return process.env;
  }
}

function isAuthorized(request: Request, env: EnvMap) {
  const cronSecret = env.CRON_SECRET;

  if (!cronSecret) {
    return true;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const urlSecret = new URL(request.url).searchParams.get("secret") ?? "";

  return authorization === `Bearer ${cronSecret}` || urlSecret === cronSecret;
}

export async function GET(request: Request) {
  try {
    const env = await getEnvMap();

    if (!isAuthorized(request, env)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdminFromEnv(env);
    const schedule = await fetchShopifySyncSchedule(supabaseAdmin);
    const scheduleCheck = checkShopifySyncSchedule(schedule);

    if (!scheduleCheck.due) {
      return NextResponse.json({
        success: true,
        ran: false,
        schedule,
        scheduleCheck,
      });
    }

    const syncResponse = await fetch(
      `${new URL(request.url).origin}/api/sync/shopify-inventory`,
      { cache: "no-store" }
    );

    const syncResult = (await syncResponse.json()) as SyncResult;

    if (!syncResponse.ok || !syncResult.success) {
      return NextResponse.json(
        {
          success: false,
          ran: false,
          schedule,
          scheduleCheck,
          syncResult,
        },
        { status: 500 }
      );
    }

    const updatedSchedule = await markShopifySyncScheduleRun(
      supabaseAdmin,
      schedule,
      scheduleCheck.runKey
    );

    return NextResponse.json({
      success: true,
      ran: true,
      schedule: updatedSchedule,
      scheduleCheck,
      syncResult,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown scheduled sync error";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}