import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSupabaseAdminFromEnv, type EnvMap } from "@/lib/supabaseEnv";
import { getCurrentSession, hashPassword, requireAdmin } from "@/lib/authServer";

export const runtime = "nodejs";

async function getEnvMap(): Promise<EnvMap> {
  try {
    const context = await getCloudflareContext({ async: true });
    return { ...process.env, ...(context.env as EnvMap) };
  } catch {
    return process.env;
  }
}

function publicUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    accessLevel: row.access_level,
    status: row.status,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireAdmin(await getCurrentSession());
    const { id } = await context.params;
    const body = (await request.json()) as {
      email?: string;
      username?: string;
      role?: string;
      accessLevel?: string;
      status?: string;
      password?: string;
    };
    const updates: Record<string, string> = {};

    if (body.email) updates.email = body.email.trim().toLowerCase();
    if (body.username) updates.username = body.username.trim();
    if (body.role) updates.role = body.role;
    if (body.accessLevel) updates.access_level = body.accessLevel;
    if (body.status) updates.status = body.status;

    if (body.password) {
      if (body.password.length < 10) {
        return NextResponse.json(
          { error: "Password must be at least 10 characters." },
          { status: 400 }
        );
      }

      const { hash, salt } = hashPassword(body.password);
      updates.password_hash = hash;
      updates.password_salt = salt;
    }

    const env = await getEnvMap();
    const supabase = getSupabaseAdminFromEnv(env);
    const { data, error } = await supabase
      .from("app_users")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id,email,username,role,access_level,status")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ user: publicUser(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Admin access") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireAdmin(await getCurrentSession());
    const { id } = await context.params;
    const env = await getEnvMap();
    const supabase = getSupabaseAdminFromEnv(env);
    const { error } = await supabase.from("app_users").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Admin access") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
