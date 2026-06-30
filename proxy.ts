import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  base64UrlFromBytes,
  decodeJson,
  timingSafeEqualText,
  type AppSession,
} from "@/lib/authCore";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/shopify/sales-90-day",
];

function getSessionSecret() {
  return process.env.APP_SESSION_SECRET ?? "";
}

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)$/)
  );
}

function isCronRequest(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/cron/")) {
    return false;
  }

  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const urlSecret = request.nextUrl.searchParams.get("secret");

  return authorization === `Bearer ${cronSecret}` || urlSecret === cronSecret;
}

function isMachineSyncRequest(request: NextRequest) {
  if (request.nextUrl.pathname !== "/api/sync/shopify-inventory") {
    return false;
  }

  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const urlSecret = request.nextUrl.searchParams.get("secret");

  return authorization === `Bearer ${cronSecret}` || urlSecret === cronSecret;
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  return base64UrlFromBytes(new Uint8Array(signature));
}

async function verifySession(request: NextRequest) {
  const secret = getSessionSecret();

  if (secret.length < 32) {
    return null;
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const [payload, signature] = token?.split(".") ?? [];

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = await sign(payload, secret);

  if (!timingSafeEqualText(signature, expectedSignature)) {
    return null;
  }

  let session: AppSession;

  try {
    session = decodeJson<AppSession>(payload);
  } catch {
    return null;
  }

  if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return session;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) || isCronRequest(request) || isMachineSyncRequest(request)) {
    return NextResponse.next();
  }

  const session = await verifySession(request);

  if (session) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
