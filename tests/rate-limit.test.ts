import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consumeRateLimit,
  consumePostgresRateLimit,
  FixedWindowRateLimiter,
  positiveInteger,
  rateLimitHeaders,
  SharedRateLimitUnavailableError,
} from "@/lib/server/security/rate-limit";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("fixed-window rate limiter", () => {
  it("limits each identity independently and resets after the window", () => {
    const limiter = new FixedWindowRateLimiter();
    expect(limiter.consume("session-a", 2, 1_000, 5_000)).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.consume("session-a", 2, 1_000, 5_100)).toMatchObject({ allowed: true, remaining: 0 });
    const denied = limiter.consume("session-a", 2, 1_000, 5_200);
    expect(denied).toMatchObject({ allowed: false, remaining: 0, resetAt: 6_000 });
    expect(limiter.consume("session-b", 2, 1_000, 5_200)).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.consume("session-a", 2, 1_000, 6_000)).toMatchObject({ allowed: true, remaining: 1 });
  });

  it("returns standard cooldown metadata only when blocked", () => {
    const allowed = rateLimitHeaders({ allowed: true, limit: 2, remaining: 1, resetAt: 8_000 }, 5_000);
    expect(allowed).toEqual({
      "X-RateLimit-Limit": "2",
      "X-RateLimit-Remaining": "1",
      "X-RateLimit-Reset": "8",
    });
    const denied = rateLimitHeaders({ allowed: false, limit: 2, remaining: 0, resetAt: 8_000 }, 5_000);
    expect(denied).toMatchObject({ "Retry-After": "3", "X-RateLimit-Remaining": "0" });
  });

  it("uses safe defaults for malformed environment values", () => {
    expect(positiveInteger("12", 5)).toBe(12);
    expect(positiveInteger("0", 5)).toBe(5);
    expect(positiveInteger("not-a-number", 5)).toBe(5);
  });

  it("uses the in-process limiter only outside production when Postgres is absent", async () => {
    const first = await consumeRateLimit("local-test", 1, 1_000, 5_000);
    const denied = await consumeRateLimit("local-test", 1, 1_000, 5_100);

    expect(first).toMatchObject({ allowed: true, remaining: 0 });
    expect(denied).toMatchObject({ allowed: false, remaining: 0 });
  });

  it("maps the atomic Postgres result to quota metadata", async () => {
    const queryMock = vi.fn().mockResolvedValue([{ count: "2", reset_at_ms: "5750" }]);
    const result = await consumePostgresRateLimit(
      { query: queryMock },
      "agent:session:test",
      3,
      1_000,
    );

    expect(result).toEqual({ allowed: true, limit: 3, remaining: 1, resetAt: 5_750 });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT (key) DO UPDATE"),
      ["omnipro:rate-limit:agent:session:test", 1_000],
    );
  });

  it("rejects malformed shared-store counters", async () => {
    await expect(consumePostgresRateLimit(
      { query: vi.fn().mockResolvedValue([{ count: "invalid", reset_at_ms: "5750" }]) },
      "agent:session:test",
      3,
      1_000,
    )).rejects.toBeInstanceOf(SharedRateLimitUnavailableError);
  });

  it("fails closed in production when shared storage is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("RATE_LIMIT_DATABASE_URL", "");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("POSTGRES_URL", "");

    await expect(consumeRateLimit("production-test", 1, 1_000)).rejects.toBeInstanceOf(
      SharedRateLimitUnavailableError,
    );
  });
});
