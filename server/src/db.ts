import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR ?? path.resolve(process.cwd(), "data");
const DB_FILE = process.env.DB_FILE ?? path.join(DATA_DIR, "haru.db");

if (DB_FILE !== ":memory:") fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

export const db = new DatabaseSync(DB_FILE);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

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
  created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pets (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  intimacy   REAL NOT NULL DEFAULT 8,
  fullness   REAL NOT NULL DEFAULT 70,
  energy     REAL NOT NULL DEFAULT 90,
  mood       TEXT NOT NULL DEFAULT 'calm',
  mood_until INTEGER NOT NULL DEFAULT 0,
  equipped   TEXT NOT NULL DEFAULT '{}',
  theme      TEXT NOT NULL DEFAULT 'sunny',
  last_tick  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL,
  acquired_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  data       TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_user_type_time ON events(user_id, type, created_at);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  emotion    TEXT,
  risk       TEXT NOT NULL DEFAULT 'none',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_user_time ON messages(user_id, created_at);

CREATE TABLE IF NOT EXISTS diary (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,
  content    TEXT NOT NULL,
  mood       TEXT NOT NULL,
  created_at INTEGER NOT NULL
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
`);

export type Row = Record<string, unknown>;

export function tx<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
