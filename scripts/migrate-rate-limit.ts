import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

async function main(): Promise<void> {
  const connectionString = process.env.RATE_LIMIT_DATABASE_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error("RATE_LIMIT_DATABASE_URL, DATABASE_URL, or POSTGRES_URL is required");
  }

  const migration = await readFile(resolve("migrations/001-rate-limits.sql"), "utf8");
  const statements = migration
    .split(/^-- statement-breakpoint\s*$/m)
    .map((statement) => statement.trim())
    .filter(Boolean);

  const sql = neon(connectionString);
  await sql.transaction((transaction) => statements.map((statement) => transaction.query(statement)));

  console.log(`Applied rate-limit migration (${statements.length} statements).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Rate-limit migration failed");
  process.exitCode = 1;
});
