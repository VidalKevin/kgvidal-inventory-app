import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSupabaseAdminFromEnv, type EnvMap } from "@/lib/supabaseEnv";
import {
  hashPassword,
  setSessionCookie,
  userToSession,
  verifyPassword,
  type AppUserRow,
} from "@/lib/authServer";

export const runtime = "nodejs";

async function getEnvMap(): Promise<EnvMap> {
  try {
    const context = await getCloudflareContext({ async: true });
    return { ...process.env, ...(context.env as EnvMap) };
  } catch {
    return process.env;
  }
}

async function ensureBootstrapAdmin(env: EnvMap, identifier: string, password: string) {
  const bootstrapEmail = env.APP_BOOTSTRAP_ADMIN_EMAIL;
  const bootstrapPassword = env.APP_BOOTSTRAP_ADMIN_PASSWORD;

  if (!bootstrapEmail || !bootstrapPassword) {
    return null;
  }

  if (
    identifier.toLowerCase() !== bootstrapEmail.toLowerCase() ||
    password !== bootstrapPassword
  ) {
    return null;
  }

  const supabase = getSupabaseAdminFromEnv(env);
  const { data: existing, error: selectError } = await supabase
    .from("app_users")
    .select("*")
    .or(`email.eq.${bootstrapEmail},username.eq.${bootstrapEmail}`)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existing) {
    return existing as AppUserRow;
  }

  const { hash, salt } = hashPassword(bootstrapPassword);
  const { data, error } = await supabase
    .from("app_users")
    .insert({
      email: bootstrapEmail,
      username: bootstrapEmail.split("@")[0],
      role: "Admin",
      access_level: "Full Access",
      status: "Active",
      password_hash: hash,
      password_salt: salt,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AppUserRow;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      identifier?: string;
      password?: string;
    };
    const identifier = body.identifier?.trim() ?? "";
    const password = body.password ?? "";

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Username/email and password are required." },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9@._+-]+$/.test(identifier)) {
      return NextResponse.json(
        { error: "Invalid login or inactive user." },
        { status: 401 }
      );
    }

    const env = await getEnvMap();
    const supabase = getSupabaseAdminFromEnv(env);
    const bootstrapUser = await ensureBootstrapAdmin(env, identifier, password);
    const userResult = bootstrapUser
      ? { data: bootstrapUser, error: null }
      : await supabase
          .from("app_users")
          .select("*")
          .or(`email.eq.${identifier.toLowerCase()},username.eq.${identifier}`)
          .maybeSingle();

    if (userResult.error) {
      throw new Error(userResult.error.message);
    }

    const user = userResult.data as AppUserRow | null;

    if (
      !user ||
      user.status !== "Active" ||
      !verifyPassword(password, user.password_hash, user.password_salt)
    ) {
      return NextResponse.json(
        { error: "Invalid login or inactive user." },
        { status: 401 }
      );
    }

    await setSessionCookie(userToSession(user));
    return NextResponse.json({ success: true, user: userToSession(user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
