export type AppSession = {
  userId: string;
  email: string;
  username: string;
  role: string;
  accessLevel: string;
  exp: number;
};

export const AUTH_COOKIE_NAME = "kgvidal_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

export function base64UrlFromBytes(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function bytesFromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "="
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function encodeJson(value: unknown) {
  return base64UrlFromBytes(new TextEncoder().encode(JSON.stringify(value)));
}

export function decodeJson<T>(value: string): T {
  const bytes = bytesFromBase64Url(value);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

export function timingSafeEqualText(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}
