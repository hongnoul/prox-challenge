import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { config as proxyConfig, proxy } from "@/proxy";
import {
  createSessionToken,
  hasSameOrigin,
  passwordMatches,
  safeReturnPath,
  sessionFromRequest,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/server/security/session";
import { rateLimiter } from "@/lib/server/security/rate-limit";

const secret = "test-secret-that-is-at-least-thirty-two-characters";

afterEach(() => {
  vi.unstubAllEnvs();
  rateLimiter.clear();
});

describe("signed workspace sessions", () => {
  it("creates, verifies, and expires signed session tokens", async () => {
    const token = await createSessionToken("session-a", secret, 1_000);
    await expect(verifySessionToken(token, secret, 2_000)).resolves.toEqual({
      sessionId: "session-a",
      expiresAt: 604_801_000,
    });
    await expect(verifySessionToken(token, secret, 604_801_000)).resolves.toBeNull();
  });

  it("rejects a tampered session and accepts the configured password", async () => {
    const token = await createSessionToken("session-a", secret);
    await expect(verifySessionToken(token.replace("session-a", "session-b"), secret)).resolves.toBeNull();
    await expect(passwordMatches("correct", "correct")).resolves.toBe(true);
    await expect(passwordMatches("incorrect", "correct")).resolves.toBe(false);
  });

  it("extracts a signed session from an HTTP-only cookie", async () => {
    const token = await createSessionToken("cookie-session", secret);
    const request = new Request("http://localhost/", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}; other=value` },
    });
    await expect(sessionFromRequest(request, secret)).resolves.toMatchObject({ sessionId: "cookie-session" });
  });

  it("only accepts local return paths", () => {
    expect(safeReturnPath("/workspace?mode=guide")).toBe("/workspace?mode=guide");
    expect(safeReturnPath("//malicious.example")).toBe("/");
    expect(safeReturnPath("/\\malicious.example")).toBe("/");
    expect(safeReturnPath(new URLSearchParams("next=%2F%5Cmalicious.example").get("next"))).toBe("/");
    expect(safeReturnPath("https://malicious.example")).toBe("/");
    expect(safeReturnPath("/api/health")).toBe("/");
  });

  it("requires both host and scheme to match for browser mutations", () => {
    expect(hasSameOrigin(new Request("https://app.example/api/agent", {
      headers: { Host: "app.example", Origin: "https://app.example" },
    }))).toBe(true);
    expect(hasSameOrigin(new Request("https://app.example/api/agent", {
      headers: { Host: "app.example", Origin: "http://app.example" },
    }))).toBe(false);
  });
});

describe("password login", () => {
  it("sets an HTTP-only signed cookie after a valid password", async () => {
    vi.stubEnv("APP_PASSWORD", "test-password");
    vi.stubEnv("AUTH_SECRET", secret);
    const form = new URLSearchParams();
    form.set("password", "test-password");
    form.set("next", "/?mode=guide");

    const response = await login(new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: form,
      headers: { "x-real-ip": "192.0.2.10" },
    }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/?mode=guide");
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });

  it("redirects back with an error after an invalid password", async () => {
    vi.stubEnv("APP_PASSWORD", "test-password");
    vi.stubEnv("AUTH_SECRET", secret);
    const form = new URLSearchParams();
    form.set("password", "wrong");

    const response = await login(new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: form,
      headers: { "x-real-ip": "192.0.2.11" },
    }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/login?error=invalid");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("throttles repeated password attempts by source address", async () => {
    vi.stubEnv("APP_PASSWORD", "test-password");
    vi.stubEnv("AUTH_SECRET", secret);
    vi.stubEnv("LOGIN_RATE_LIMIT_MAX", "2");
    const request = () => new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: new URLSearchParams({ password: "wrong" }),
      headers: { "x-real-ip": "192.0.2.12" },
    });

    expect((await login(request())).status).toBe(303);
    expect((await login(request())).status).toBe(303);
    const denied = await login(request());
    expect(denied.status).toBe(429);
    expect(denied.headers.get("Retry-After")).toBeTruthy();
  });

  it("rejects oversized login bodies", async () => {
    vi.stubEnv("APP_PASSWORD", "test-password");
    vi.stubEnv("AUTH_SECRET", secret);
    const response = await login(new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: new URLSearchParams({ password: "x".repeat(5_000) }),
      headers: { "x-real-ip": "192.0.2.13" },
    }));
    expect(response.status).toBe(413);
  });

  it("fails closed when production shared rate limiting is unavailable", async () => {
    vi.stubEnv("APP_PASSWORD", "test-password");
    vi.stubEnv("AUTH_SECRET", secret);
    vi.stubEnv("RATE_LIMIT_REQUIRE_SHARED", "true");

    const response = await login(new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: new URLSearchParams({ password: "test-password" }),
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Login rate limiting is temporarily unavailable",
    });
  });
});

describe("routing guard", () => {
  it("redirects anonymous page requests and rejects anonymous API requests", async () => {
    vi.stubEnv("AUTH_SECRET", secret);
    const pageResponse = await proxy(new NextRequest("http://localhost/?mode=guide"));
    expect(pageResponse.status).toBe(307);
    expect(pageResponse.headers.get("location")).toBe("http://localhost/login?next=%2F%3Fmode%3Dguide");

    const apiResponse = await proxy(new NextRequest("http://localhost/api/health"));
    expect(apiResponse.status).toBe(401);
    await expect(apiResponse.json()).resolves.toEqual({ error: "Authentication required" });
  });

  it("allows a request carrying a valid session cookie", async () => {
    vi.stubEnv("AUTH_SECRET", secret);
    const token = await createSessionToken("proxy-session", secret);
    const response = await proxy(new NextRequest("http://localhost/", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("always includes API routes even when a path has an asset-like suffix", () => {
    expect(proxyConfig.matcher[0]).toBe("/api/:path*");
  });
});

describe("logout", () => {
  it("rejects cross-origin requests and clears valid same-origin sessions", async () => {
    vi.stubEnv("AUTH_SECRET", secret);
    const token = await createSessionToken("logout-session", secret);
    const cookie = `${SESSION_COOKIE_NAME}=${token}`;

    const rejected = await logout(new Request("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { Cookie: cookie, Host: "localhost", Origin: "https://malicious.example" },
    }));
    expect(rejected.status).toBe(403);

    const response = await logout(new Request("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { Cookie: cookie, Host: "localhost", Origin: "http://localhost" },
    }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/login");
    expect(response.headers.get("set-cookie")).toContain(`${SESSION_COOKIE_NAME}=;`);
  });
});
