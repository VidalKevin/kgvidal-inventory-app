import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSupabaseAdminFromEnv, type EnvMap } from "@/lib/supabaseEnv";

export const runtime = "nodejs";

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
    const { data, error } = await supabaseAdmin
      .from("shiphero_onhold_orders")
      .select("*")
      .order("order_date", { ascending: false });

    if (error) throw new Error(error.message);

    const syncedAt =
      data && data.length > 0 ? (data[0] as { synced_at?: string }).synced_at ?? null : null;

    return NextResponse.json({ orders: data ?? [], syncedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  const scriptPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    ...["scripts", "sync-shiphero-onhold.mjs"]
  );

  return new Promise<NextResponse>((resolve) => {
    const child = spawn("node", [scriptPath], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    const stdout: string[] = [];
    const stderr: string[] = [];

    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk.toString()));
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk.toString()));

    child.on("close", (code) => {
      if (code === 0) {
        resolve(NextResponse.json({ success: true, output: stdout.join("") }));
      } else {
        resolve(
          NextResponse.json(
            {
              error: "Sync script failed.",
              details: stderr.join("") || stdout.join(""),
            },
            { status: 500 }
          )
        );
      }
    });

    child.on("error", (err) => {
      resolve(
        NextResponse.json(
          {
            error: `Failed to start sync: ${err.message}. Make sure Playwright is installed and you are running locally.`,
          },
          { status: 500 }
        )
      );
    });
  });
}
