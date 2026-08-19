import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { consumePostgresRateLimit } from "../lib/server/security/rate-limit";

async function main(): Promise<void> {
  const connectionString = process.env.RATE_LIMIT_DATABASE_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error("RATE_LIMIT_DATABASE_URL, DATABASE_URL, or POSTGRES_URL is required");
  }

  const sql = neon(connectionString);
  const key = `database-check:${crypto.randomUUID()}`;
  const storedKey = `omnipro:rate-limit:${key}`;

  try {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => consumePostgresRateLimit(sql, key, 6, 60_000)),
    );
    const allowed = results.filter((result) => result.allowed).length;
    const denied = results.length - allowed;

    assert.equal(allowed, 6, "the shared limiter must allow exactly the configured quota");
    assert.equal(denied, 14, "concurrent requests beyond the quota must be denied");
    assert.equal(
      new Set(results.map((result) => result.resetAt)).size,
      1,
      "all requests in one fixed window must share a reset time",
    );

    console.log(`Neon limiter check passed: ${allowed} allowed, ${denied} denied.`);
  } finally {
    await sql.query("DELETE FROM omnipro_rate_limits WHERE key = $1", [storedKey]);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Neon limiter check failed");
  process.exitCode = 1;
});
