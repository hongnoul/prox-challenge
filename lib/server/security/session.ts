const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export const SESSION_COOKIE_NAME = "omnipro_session";
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_SECONDS;

export type SessionClaims = {
  sessionId: string;
  expiresAt: number;
};

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function cookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const segment of cookieHeader.split(";")) {
    const separator = segment.indexOf("=");
    if (separator < 0 || segment.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(segment.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export async function createSessionToken(
  sessionId: string,
  secret: string,
  now = Date.now(),
): Promise<string> {
  const expiresAt = now + SESSION_TTL_SECONDS * 1_000;
  const payload = `${sessionId}.${expiresAt}`;
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<SessionClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [sessionId, expiresAtText, signature] = parts;
  const expiresAt = Number(expiresAtText);
  if (!sessionId || !Number.isSafeInteger(expiresAt) || expiresAt <= now) return null;

  const payload = `${sessionId}.${expiresAtText}`;
  const expected = await hmac(payload, secret);
  if (!constantTimeEqual(signature, expected)) return null;
  return { sessionId, expiresAt };
}

export async function sessionFromRequest(
  request: Request,
  secret = process.env.AUTH_SECRET,
  now = Date.now(),
): Promise<SessionClaims | null> {
  if (!secret) return null;
  const token = cookieValue(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  return token ? verifySessionToken(token, secret, now) : null;
}

export async function passwordMatches(candidate: string, expected: string): Promise<boolean> {
  const [candidateHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return constantTimeEqual(
    bytesToBase64Url(new Uint8Array(candidateHash)),
    bytesToBase64Url(new Uint8Array(expectedHash)),
  );
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;
  try {
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
      || new URL(request.url).protocol.replace(":", "");
    return new URL(origin).origin === `${protocol}://${host}`;
  } catch {
    return false;
  }
}

export function safeReturnPath(value: FormDataEntryValue | string | null | undefined): string {
  if (
    typeof value !== "string"
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
    || /[\u0000-\u001f\u007f]/.test(value)
  ) return "/";
  if (value.startsWith("/api/")) return "/";
  return value;
}
