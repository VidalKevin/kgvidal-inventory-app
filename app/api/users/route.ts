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

export async function GET() {
  try {
    requireAdmin(await getCurrentSession());
    const env = await getEnvMap();
    const supabase = getSupabaseAdminFromEnv(env);
    const { data, error } = await supabase
      .from("app_users")
      .select("id,email,username,role,access_level,status")
      .order("email");

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ users: (data ?? []).map(publicUser) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Admin access") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    requireAdmin(await getCurrentSession());
    const body = (await request.json()) as {
      email?: string;
      username?: string;
      role?: string;
      accessLevel?: string;
      status?: string;
      password?: string;
    };
    const email = body.email?.trim().toLowerCase();
    const username = body.username?.trim();
    const password = body.password ?? "";

    if (!email || !username || password.length < 10) {
      return NextResponse.json(
        { error: "Email, username, and a 10+ character password are required." },
        { status: 400 }
      );
    }

    const env = await getEnvMap();
    const supabase = getSupabaseAdminFromEnv(env);
    const { hash, salt } = hashPassword(password);
    const { data, error } = await supabase
      .from("app_users")
      .insert({
        email,
        username,
        role: body.role || "User",
        access_level: body.accessLevel || "View Only",
        status: body.status || "Active",
        password_hash: hash,
        password_salt: salt,
      })
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

