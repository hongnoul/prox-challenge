import { NextRequest, NextResponse } from "next/server";
import { safeReturnPath, sessionFromRequest } from "@/lib/server/security/session";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await sessionFromRequest(request);

  if (PUBLIC_PATHS.has(pathname)) {
    if (pathname === "/login" && session) {
      return NextResponse.redirect(new URL(safeReturnPath(request.nextUrl.searchParams.get("next")), request.url));
    }
    return NextResponse.next();
  }

  if (session) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:avif|gif|ico|jpe?g|pdf|png|svg|webp|woff2?)$).*)",
  ],
};
