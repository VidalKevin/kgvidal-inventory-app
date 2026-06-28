import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  decodeJson,
  encodeJson,
  type AppSession,
} from "@/lib/authCore";

const PASSWORD_KEY_LENGTH = 64;

export type AppUserRow = {
  id: string;
  email: string;
  username: string;
  role: string;
  access_level: string;
  status: string;
  password_hash: string;
  password_salt: string;
};

function getSessionSecret() {
  const secret = process.env.APP_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("Missing APP_SESSION_SECRET. Use at least 32 random characters.");
  }

  return secret;
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string) {
  const candidate = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");

  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export function signSession(session: Omit<AppSession, "exp">) {
  const payload: AppSession = {
    ...session,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = encodeJson(payload);
  const signature = createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  let session: AppSession;

  try {
    session = decodeJson<AppSession>(encodedPayload);
  } catch {
    return null;
  }

  if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return session;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export async function setSessionCookie(session: Omit<AppSession, "exp">) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, signSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function userToSession(user: AppUserRow): Omit<AppSession, "exp"> {
  return {
    userId: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    accessLevel: user.access_level,
  };
}

export function requireAdmin(session: AppSession | null) {
  if (!session || session.role.toLowerCase() !== "admin") {
    throw new Error("Admin access required.");
  }
}
