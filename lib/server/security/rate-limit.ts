import { Redis } from "@upstash/redis";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitStore = {
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
};

const FIXED_WINDOW_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { count, ttl }
`;

export class SharedRateLimitUnavailableError extends Error {
  constructor(message = "Shared rate limiting is unavailable") {
    super(message);
    this.name = "SharedRateLimitUnavailableError";
  }
}

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  consume(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
    const existing = this.buckets.get(key);
    const bucket = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : existing;

    if (bucket.count >= limit) {
      return { allowed: false, limit, remaining: 0, resetAt: bucket.resetAt };
    }

    bucket.count += 1;
    this.buckets.set(key, bucket);
    if (this.buckets.size > 5_000) this.prune(now);
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  }

  clear(): void {
    this.buckets.clear();
  }

  private prune(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    while (this.buckets.size > 5_000) {
      const oldest = this.buckets.keys().next().value as string | undefined;
      if (!oldest) break;
      this.buckets.delete(oldest);
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __omniproRateLimiter: FixedWindowRateLimiter | undefined;
  // eslint-disable-next-line no-var
  var __omniproRateLimitRedis: { fingerprint: string; client: Redis } | undefined;
}

export const rateLimiter = globalThis.__omniproRateLimiter ??= new FixedWindowRateLimiter();

function redisClient(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const fingerprint = `${url}\u0000${token}`;
  if (globalThis.__omniproRateLimitRedis?.fingerprint === fingerprint) {
    return globalThis.__omniproRateLimitRedis.client;
  }

  const client = new Redis({ url, token });
  globalThis.__omniproRateLimitRedis = { fingerprint, client };
  return client;
}

function sharedLimiterRequired(): boolean {
  return process.env.RATE_LIMIT_REQUIRE_SHARED === "true" || process.env.VERCEL_ENV === "production";
}

function parseSharedResult(value: unknown): [count: number, ttlMs: number] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new SharedRateLimitUnavailableError("Shared limiter returned an invalid result");
  }
  const count = Number(value[0]);
  const ttlMs = Number(value[1]);
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new SharedRateLimitUnavailableError("Shared limiter returned invalid counters");
  }
  return [count, ttlMs];
}

export async function consumeSharedRateLimit(
  store: RateLimitStore,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<RateLimitResult> {
  let raw: unknown;
  try {
    raw = await store.eval(
      FIXED_WINDOW_SCRIPT,
      [`omnipro:rate-limit:${key}`],
      [String(windowMs)],
    );
  } catch (error) {
    throw new SharedRateLimitUnavailableError(
      error instanceof Error ? `Shared limiter failed: ${error.message}` : undefined,
    );
  }

  const [count, ttlMs] = parseSharedResult(raw);
  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt: now + ttlMs,
  };
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<RateLimitResult> {
  const client = redisClient();
  if (client) return consumeSharedRateLimit(client, key, limit, windowMs, now);
  if (sharedLimiterRequired()) throw new SharedRateLimitUnavailableError();
  return rateLimiter.consume(key, limit, windowMs, now);
}

export function clientAddress(request: Request): string {
  if (process.env.VERCEL) {
    const vercelIp = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
    if (vercelIp) return vercelIp;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function rateLimitHeaders(result: RateLimitResult, now = Date.now()): HeadersInit {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1_000)),
  };
  if (!result.allowed) {
    headers["Retry-After"] = String(Math.max(1, Math.ceil((result.resetAt - now) / 1_000)));
  }
  return headers;
}
