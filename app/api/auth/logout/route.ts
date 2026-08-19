import { NextResponse } from "next/server";
import {
  hasSameOrigin,
  sessionFromRequest,
  SESSION_COOKIE_NAME,
} from "@/lib/server/security/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Cross-origin logout requests are not allowed" }, { status: 403 });
  }
  if (!(await sessionFromRequest(request))) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
