import { NextResponse } from "next/server";
import {
  createSessionToken,
  hasSameOrigin,
  passwordMatches,
  safeReturnPath,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/server/security/session";
import {
  clientAddress,
  consumeRateLimit,
  positiveInteger,
  rateLimitHeaders,
  SharedRateLimitUnavailableError,
} from "@/lib/server/security/rate-limit";

export const runtime = "nodejs";
const MAX_LOGIN_BYTES = 4_096;

function loginRedirect(request: Request, error: string, next: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Cross-origin login requests are not allowed" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_LOGIN_BYTES) {
    return Response.json({ error: "Login form is too large" }, { status: 413 });
  }

  const limit = positiveInteger(process.env.LOGIN_RATE_LIMIT_MAX, 5);
  const windowSeconds = positiveInteger(process.env.LOGIN_RATE_LIMIT_WINDOW_SECONDS, 15 * 60);
  let rateLimit;
  try {
    rateLimit = await consumeRateLimit(
      `login:${clientAddress(request)}`,
      limit,
      windowSeconds * 1_000,
    );
  } catch (error) {
    if (error instanceof SharedRateLimitUnavailableError) {
      return Response.json({ error: "Login rate limiting is temporarily unavailable" }, { status: 503 });
    }
    throw error;
  }
  if (!rateLimit.allowed) {
    return new Response("Too many login attempts. Try again later.", {
      status: 429,
      headers: rateLimitHeaders(rateLimit),
    });
  }

  const password = process.env.APP_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!password || !secret || secret.length < 32) {
    return Response.json({ error: "Authentication is not configured" }, { status: 503 });
  }

  let form: URLSearchParams;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_LOGIN_BYTES) {
      return Response.json({ error: "Login form is too large" }, { status: 413 });
    }
    form = new URLSearchParams(text);
  } catch {
    return Response.json({ error: "Login form is invalid" }, { status: 400 });
  }
  const next = safeReturnPath(form.get("next"));
  const candidate = form.get("password");
  if (typeof candidate !== "string" || !(await passwordMatches(candidate, password))) {
    return loginRedirect(request, "invalid", next);
  }

  const token = await createSessionToken(crypto.randomUUID(), secret);
  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
