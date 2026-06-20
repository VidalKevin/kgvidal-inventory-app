import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { dispatchGitHubWorkflow } from "@/lib/githubActions";
import {
  checkShipheroOnholdSchedule,
  fetchShipheroOnholdSchedule,
  markShipheroOnholdScheduleRun,
} from "@/lib/shipheroOnholdSchedule";
import { getSupabaseAdminFromEnv, type EnvMap } from "@/lib/supabaseEnv";

export const runtime = "nodejs";

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
    const schedule = await fetchShipheroOnholdSchedule(supabaseAdmin);
    const scheduleCheck = checkShipheroOnholdSchedule(schedule);

    if (!scheduleCheck.due) {
      return NextResponse.json({
        success: true,
        ran: false,
        schedule,
        scheduleCheck,
      });
    }

    const workflow = await dispatchGitHubWorkflow(env, {
      workflowId: "shiphero-onhold-sync.yml",
      inputs: {
        source: "scheduled",
        run_key: scheduleCheck.runKey,
      },
    });
    const updatedSchedule = await markShipheroOnholdScheduleRun(
      supabaseAdmin,
      schedule,
      scheduleCheck.runKey
    );

    return NextResponse.json({
      success: true,
      ran: true,
      queued: true,
      schedule: updatedSchedule,
      scheduleCheck,
      workflow,
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
