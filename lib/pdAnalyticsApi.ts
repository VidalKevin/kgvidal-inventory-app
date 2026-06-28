import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSupabaseAdminFromEnv, type EnvMap } from "@/lib/supabaseEnv";

export const pdAnalyticsRuntime = "nodejs";

export async function getPdSupabaseAdmin() {
  const env = await getEnvMap();
  return getSupabaseAdminFromEnv(env);
}

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
