import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

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

type RateLimitRow = {
  count: unknown;
  reset_at_ms: unknown;
};

type RateLimitDatabase = {
  query(query: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
};

const CONSUME_RATE_LIMIT_SQL = `
WITH params AS (
  SELECT clock_timestamp() AS now, $2::bigint AS window_ms
), pruned AS (
  DELETE FROM omnipro_rate_limits
  WHERE key <> $1::text
    AND reset_at < (SELECT now FROM params) - INTERVAL '1 day'
), consumed AS (
  INSERT INTO omnipro_rate_limits (key, count, reset_at)
  SELECT $1::text, 1, now + window_ms * INTERVAL '1 millisecond'
  FROM params
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN omnipro_rate_limits.reset_at <= (SELECT now FROM params) THEN 1
      ELSE omnipro_rate_limits.count + 1
    END,
    reset_at = CASE
      WHEN omnipro_rate_limits.reset_at <= (SELECT now FROM params)
        THEN (SELECT now + window_ms * INTERVAL '1 millisecond' FROM params)
      ELSE omnipro_rate_limits.reset_at
    END
  RETURNING count, reset_at
)
SELECT
  count,
  FLOOR(EXTRACT(EPOCH FROM reset_at) * 1000)::bigint AS reset_at_ms
FROM consumed
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
  var __omniproRateLimitDatabase: {
    fingerprint: string;
    client: NeonQueryFunction<false, false>;
  } | undefined;
}

export const rateLimiter = globalThis.__omniproRateLimiter ??= new FixedWindowRateLimiter();

function rateLimitDatabaseUrl(): string | null {
  const explicit = process.env.RATE_LIMIT_DATABASE_URL;
  if (explicit) return explicit;
  const productionRuntime = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  return productionRuntime ? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null : null;
}

function sharedLimiterRequired(): boolean {
  return process.env.RATE_LIMIT_REQUIRE_SHARED === "true"
    || process.env.NODE_ENV === "production"
    || process.env.VERCEL_ENV === "production";
}

function rateLimitDatabase(): RateLimitDatabase | null {
  const url = rateLimitDatabaseUrl();
  if (!url) return null;

  const cached = globalThis.__omniproRateLimitDatabase;
  if (cached?.fingerprint === url) return cached.client;

  try {
    const client = neon(url);
    globalThis.__omniproRateLimitDatabase = { fingerprint: url, client };
    return client;
  } catch (error) {
    throw new SharedRateLimitUnavailableError(
      error instanceof Error ? `Shared limiter configuration failed: ${error.message}` : undefined,
    );
  }
}

function parseSharedResult(value: unknown): [count: number, resetAt: number] {
  if (!Array.isArray(value) || value.length !== 1) {
    throw new SharedRateLimitUnavailableError("Shared limiter returned an invalid result");
  }
  const row = value[0] as Partial<RateLimitRow> | null;
  const count = Number(row?.count);
  const resetAt = Number(row?.reset_at_ms);
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(resetAt) || resetAt <= 0) {
    throw new SharedRateLimitUnavailableError("Shared limiter returned invalid counters");
  }
  return [count, resetAt];
}

export async function consumePostgresRateLimit(
  store: RateLimitDatabase,
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  let raw: unknown;
  try {
    raw = await store.query(CONSUME_RATE_LIMIT_SQL, [`omnipro:rate-limit:${key}`, windowMs]);
  } catch (error) {
    throw new SharedRateLimitUnavailableError(
      error instanceof Error ? `Shared limiter failed: ${error.message}` : undefined,
    );
  }

  const [count, resetAt] = parseSharedResult(raw);
  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<RateLimitResult> {
  const client = rateLimitDatabase();
  if (client) return consumePostgresRateLimit(client, key, limit, windowMs);
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
