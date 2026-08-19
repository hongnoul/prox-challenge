import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consumeRateLimit,
  consumeSharedRateLimit,
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

  it("uses the in-process limiter only outside production when Redis is absent", async () => {
    const first = await consumeRateLimit("local-test", 1, 1_000, 5_000);
    const denied = await consumeRateLimit("local-test", 1, 1_000, 5_100);

    expect(first).toMatchObject({ allowed: true, remaining: 0 });
    expect(denied).toMatchObject({ allowed: false, remaining: 0 });
  });

  it("maps the atomic Redis script result to quota metadata", async () => {
    const evalMock = vi.fn().mockResolvedValue([2, 750]);
    const result = await consumeSharedRateLimit(
      { eval: evalMock },
      "agent:session:test",
      3,
      1_000,
      5_000,
    );

    expect(result).toEqual({ allowed: true, limit: 3, remaining: 1, resetAt: 5_750 });
    expect(evalMock).toHaveBeenCalledWith(
      expect.stringContaining("INCR"),
      ["omnipro:rate-limit:agent:session:test"],
      ["1000"],
    );
  });

  it("fails closed in production when shared storage is not configured", async () => {
    vi.stubEnv("RATE_LIMIT_REQUIRE_SHARED", "true");

    await expect(consumeRateLimit("production-test", 1, 1_000)).rejects.toBeInstanceOf(
      SharedRateLimitUnavailableError,
    );
  });
});
