import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { DDL, TRGM_DDL } from "./ddl";
import path from "path";

// Single database handle for the whole app.
//
// - No DATABASE_URL  -> embedded PGlite (file-backed Postgres, zero install)
// - DATABASE_URL set -> real Postgres via node-postgres
//
// Both are driven through the same Drizzle schema, so switching to a real
// Postgres in production is just an env var.
export type Db = NodePgDatabase<typeof schema>;

type DbGlobal = typeof globalThis & { __importappDb?: Promise<Db> };

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  let db: Db;
  let raw: { exec?: (sql: string) => Promise<unknown>; query: (sql: string) => Promise<unknown> };

  if (url) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { Pool } = await import("pg");
    // Managed Postgres public endpoints (Railway, Heroku, etc.) require TLS
    // but present a proxy cert; internal/private URLs typically use no TLS.
    const needsSsl = /sslmode=require/.test(url) || process.env.PGSSL === "1";
    const pool = new Pool({
      connectionString: url,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    });
    db = drizzle(pool, { schema });
    raw = { query: (sql) => pool.query(sql) };
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
    const dataDir =
      process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), "data", "pglite");
    const client = new PGlite(dataDir, { extensions: { pg_trgm } });
    const { drizzle } = await import("drizzle-orm/pglite");
    db = drizzle(client, { schema }) as unknown as Db;
    raw = { exec: (sql) => client.exec(sql), query: (sql) => client.query(sql) };
  }

  // Bootstrap schema (idempotent).
  if (raw.exec) {
    await raw.exec(DDL);
  } else {
    await raw.query(DDL);
  }
  try {
    if (raw.exec) {
      await raw.exec(TRGM_DDL);
    } else {
      await raw.query(TRGM_DDL);
    }
  } catch {
    // pg_trgm unavailable on this server — fuzzy search falls back to ILIKE scans.
  }
  return db;
}

export function getDb(): Promise<Db> {
  const g = globalThis as DbGlobal;
  if (!g.__importappDb) {
    // Don't cache a failed init — let the next request retry the connection.
    g.__importappDb = createDb().catch((e) => {
      g.__importappDb = undefined;
      throw e;
    });
  }
  return g.__importappDb;
}

export { schema };
