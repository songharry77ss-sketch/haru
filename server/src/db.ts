/**
 * Database access. One SQL dialect (PostgreSQL), two drivers:
 *
 *  - DATABASE_URL set  → postgres.js against a real server (Neon / Supabase / any Postgres in production)
 *  - otherwise         → PGlite, an embedded Postgres, so local development and tests need no setup
 *
 * Queries use `?` placeholders; they are rewritten to $1, $2, … before they reach the driver.
 */
import "./env.js";
import fs from "node:fs";
import path from "node:path";

export type Row = Record<string, unknown>;

export interface Db {
  driver: "postgres" | "pglite";
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

const TABLES = ["users", "pets", "inventory", "events", "messages", "diary", "usage", "rewards"] as const;

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  token_hash      TEXT UNIQUE NOT NULL,
  recovery_code   TEXT UNIQUE NOT NULL,
  guardian_code   TEXT UNIQUE NOT NULL,
  nickname        TEXT NOT NULL,
  age_group       TEXT NOT NULL DEFAULT 'teen',
  character       TEXT NOT NULL,
  pet_name        TEXT NOT NULL,
  coins           INTEGER NOT NULL DEFAULT 100,
  gems            INTEGER NOT NULL DEFAULT 3,
  daily_limit_min INTEGER NOT NULL DEFAULT 30,
  created_at      BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS pets (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  intimacy   DOUBLE PRECISION NOT NULL DEFAULT 8,
  fullness   DOUBLE PRECISION NOT NULL DEFAULT 70,
  energy     DOUBLE PRECISION NOT NULL DEFAULT 90,
  mood       TEXT NOT NULL DEFAULT 'calm',
  mood_until BIGINT NOT NULL DEFAULT 0,
  equipped   TEXT NOT NULL DEFAULT '{}',
  theme      TEXT NOT NULL DEFAULT 'sunny',
  last_tick  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL,
  acquired_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS events (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  data       TEXT NOT NULL DEFAULT '{}',
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_user_type_time ON events(user_id, type, created_at);

CREATE TABLE IF NOT EXISTS messages (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  emotion    TEXT,
  risk       TEXT NOT NULL DEFAULT 'none',
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id, id);

CREATE TABLE IF NOT EXISTS diary (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,
  content    TEXT NOT NULL,
  mood       TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_diary_user_day ON diary(user_id, day);

CREATE TABLE IF NOT EXISTS usage (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day     TEXT NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS rewards (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day     TEXT NOT NULL,
  kind    TEXT NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, kind)
);

-- Only the API server (table owner) may touch these tables. With row level security on and no policies,
-- no other database role (for example a provider's public REST endpoint) can read or write children's data.
${TABLES.map((t) => `ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;`).join("\n")}
`;

const numbered = (sql: string) => {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
};

/** The connection string, wherever the host put it. Vercel's storage integrations may add their own prefix. */
function databaseUrl(): string | undefined {
  const direct = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (direct) return direct;
  for (const [key, value] of Object.entries(process.env)) {
    if (value && /(^|_)(DATABASE|POSTGRES)_URL$/.test(key) && /^postgres(ql)?:\/\//.test(value)) return value;
  }
  return undefined;
}

async function connect(): Promise<Db> {
  const raw = databaseUrl();
  if (raw) {
    const { default: postgres } = await import("postgres");
    // Hosts append their own query parameters (sslmode, pgbouncer, …). The driver would forward unknown
    // ones to the server as settings and the connection would be refused, so they are dropped; TLS is set below.
    const parsed = new URL(raw);
    parsed.search = "";
    const url = parsed.toString();
    const host = parsed.hostname;
    const local = host === "localhost" || host === "127.0.0.1";
    const sql = postgres(url, {
      // Connection poolers in transaction mode (Neon, Supabase) do not keep prepared statements between queries.
      prepare: false,
      // One connection per serverless instance; queries on it are pipelined.
      max: Number(process.env.DB_POOL_MAX ?? 1),
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: local ? false : "require",
      onnotice: () => undefined,
      types: {
        // Timestamps are stored as epoch milliseconds in BIGINT; they fit in a JS number.
        bigint: { to: 20, from: [20], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
      },
    });
    return {
      driver: "postgres",
      query: async <T,>(q: string, params: unknown[] = []) => (await sql.unsafe(numbered(q), params as never[])) as unknown as T[],
      exec: async (q) => {
        await sql.unsafe(q);
      },
      close: () => sql.end({ timeout: 5 }),
    };
  }

  // The embedded database is a development convenience; a deployment without DATABASE_URL is a misconfiguration.
  if (process.env.VERCEL) throw new Error("DATABASE_URL is not set on this deployment");
  const { PGlite, types } = await import("@electric-sql/pglite");
  const memory = process.env.DB_FILE === ":memory:";
  const dir = path.join(process.env.DATA_DIR ?? path.resolve(process.cwd(), "data"), "pg");
  if (!memory) fs.mkdirSync(dir, { recursive: true });
  const pg = new PGlite(memory ? undefined : dir, { parsers: { [types.INT8]: (v: string) => Number(v) } });
  await pg.waitReady;
  return {
    driver: "pglite",
    query: async <T,>(q: string, params: unknown[] = []) => (await pg.query(numbered(q), params)).rows as T[],
    exec: async (q) => {
      await pg.exec(q);
    },
    close: () => pg.close(),
  };
}

let ready: Promise<Db> | null = null;

/**
 * The shared connection. Tables are created automatically when they are missing, so a brand-new
 * database (local or Supabase) needs no manual setup. The check is one cheap query per cold start.
 */
export function getDb(): Promise<Db> {
  ready ??= connect().then(async (db) => {
    if (db.driver === "pglite" || process.env.AUTO_MIGRATE === "1") {
      await db.exec(SCHEMA);
    } else {
      const [row] = await db.query<{ present: boolean }>("SELECT to_regclass('public.rewards') IS NOT NULL AS present");
      // The advisory lock makes two servers starting at the same moment take turns creating the tables.
      if (!row?.present) await db.exec(`SELECT pg_advisory_xact_lock(4127001);\n${SCHEMA}`);
    }
    return db;
  });
  // A failed connection must not be cached, or the instance would keep failing after the database recovers.
  ready.catch(() => {
    ready = null;
  });
  return ready;
}

export async function query<T = Row>(sql: string, params?: unknown[]): Promise<T[]> {
  return (await getDb()).query<T>(sql, params);
}

export async function one<T = Row>(sql: string, params?: unknown[]): Promise<T | undefined> {
  return (await query<T>(sql, params))[0];
}

export async function closeDb() {
  if (!ready) return;
  const db = await ready;
  ready = null;
  await db.close();
}
