import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as postAgent } from "@/app/api/agent/route";
import { GET as getHealth } from "@/app/api/health/route";
import { validateSceneCommands } from "@/lib/server/agent/tools";
import { createInitialTwinState } from "@/lib/shared/contracts";
import { rateLimiter } from "@/lib/server/security/rate-limit";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/server/security/session";

const validBody = JSON.stringify({
  message: "Show the negative socket",
  twinState: createInitialTwinState(),
});

afterEach(() => {
  vi.unstubAllEnvs();
  rateLimiter.clear();
});

describe("agent transport boundary", () => {
  it("rejects cross-origin browser requests", async () => {
    const response = await postAgent(new Request("http://localhost/api/agent", {
      method: "POST",
      body: validBody,
      headers: {
        "Content-Type": "application/json",
        Host: "localhost",
        Origin: "https://malicious.example",
      },
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Cross-origin agent requests are not allowed",
    });
  });

  it("rejects a declared oversized request before parsing", async () => {
    const response = await postAgent(new Request("http://localhost/api/agent", {
      method: "POST",
      body: validBody,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "20000",
      },
    }));

    expect(response.status).toBe(413);
  });

  it("reports package and agent readiness without exposing secrets", async () => {
    const response = getHealth();
    const payload = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "ok",
      productId: "vulcan-omnipro-220",
      packageVersion: "1.0.0",
    });
    expect(JSON.stringify(payload)).not.toContain("ANTHROPIC_API_KEY");
  });

  it("requires a signed session and enforces its agent-turn quota", async () => {
    const secret = "test-secret-that-is-at-least-thirty-two-characters";
    vi.stubEnv("AUTH_SECRET", secret);
    vi.stubEnv("OMNIPRO_AGENT_MODE", "deterministic");
    vi.stubEnv("AGENT_RATE_LIMIT_MAX", "1");
    vi.stubEnv("AGENT_RATE_LIMIT_WINDOW_SECONDS", "600");
    vi.stubEnv("AGENT_IP_DAILY_LIMIT_MAX", "10");

    const unauthenticated = await postAgent(new Request("http://localhost/api/agent", {
      method: "POST",
      body: validBody,
      headers: { "Content-Type": "application/json" },
    }));
    expect(unauthenticated.status).toBe(401);

    const token = await createSessionToken("rate-limit-session", secret);
    const request = () => new Request("http://localhost/api/agent", {
      method: "POST",
      body: validBody,
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
        "x-real-ip": "192.0.2.50",
      },
    });

    const allowed = await postAgent(request());
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("X-RateLimit-Remaining")).toBe("0");
    await allowed.text();

    const denied = await postAgent(request());
    expect(denied.status).toBe(429);
    expect(denied.headers.get("Retry-After")).toBeTruthy();
    await expect(denied.json()).resolves.toEqual({
      error: "Agent request limit reached. Try again after the cooldown.",
    });
  });

  it("fails closed when production shared rate limiting is unavailable", async () => {
    const secret = "test-secret-that-is-at-least-thirty-two-characters";
    vi.stubEnv("AUTH_SECRET", secret);
    vi.stubEnv("OMNIPRO_AGENT_MODE", "deterministic");
    vi.stubEnv("RATE_LIMIT_REQUIRE_SHARED", "true");
    const token = await createSessionToken("missing-shared-store", secret);

    const response = await postAgent(new Request("http://localhost/api/agent", {
      method: "POST",
      body: validBody,
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Agent rate limiting is temporarily unavailable",
    });
  });
});

describe("scene command trust boundary", () => {
  it("accepts commands targeting verified scene bindings", () => {
    expect(validateSceneCommands([
      { type: "focus-part", entityId: "front-negative-socket" },
      {
        type: "animate-connection",
        fromEntityId: "tig-torch",
        toEntityId: "front-negative-socket",
      },
    ])).not.toBeNull();
  });

  it("rejects unknown or non-rendered scene targets", () => {
    expect(validateSceneCommands([
      { type: "focus-part", entityId: "invented-component" },
    ])).toBeNull();
    expect(validateSceneCommands([
      { type: "focus-part", entityId: "argon-cylinder" },
    ])).toBeNull();
  });
});
