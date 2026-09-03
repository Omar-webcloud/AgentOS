import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { SCHEMA } from "./schema.js";

export interface DbOptions {
  /** File path for SQLite, or ":memory:" for an ephemeral database. */
  path?: string;
}

export interface Db {
  /** Resolved database location — the file path, or `:memory:`. */
  path: string;
  raw: DatabaseSync;
  exec(sql: string): void;
  prepare<T>(sql: string): {
    all(...params: unknown[]): T[];
    get(...params: unknown[]): T | undefined;
    run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  };
  close(): void;
}

/**
 * Opens (and migrates) the SQLite database. Uses Node's built-in `node:sqlite`
 * so the MVP has zero external database dependencies, while keeping a thin
 * interface that a Postgres adapter can replace later (PRD §124/§125).
 */
export function createDb(options: DbOptions = {}): Db {
  const path = options.path ?? process.env.DATABASE_PATH ?? resolve(process.cwd(), "data/agentos.db");
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const raw = new DatabaseSync(path);
  raw.exec(SCHEMA);
  migrate(raw);

  return {
    path,
    raw,
    exec: (sql: string) => raw.exec(sql),
    prepare: <T>(sql: string) => {
      const stmt = raw.prepare(sql);
      return {
        all: (...params: unknown[]) => stmt.all(...(params as any[])) as T[],
        get: (...params: unknown[]) => stmt.get(...(params as any[])) as T | undefined,
        run: (...params: unknown[]) => stmt.run(...(params as any[])) as { changes: number | bigint; lastInsertRowid: number | bigint },
      };
    },
    close: () => raw.close(),
  };
}

/**
 * Additive migrations for databases created before Google Sign-In / brains.
 * `CREATE TABLE IF NOT EXISTS` will not add columns to an existing table.
 */
function migrate(raw: DatabaseSync): void {
  const userCols = new Set(
    (raw.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map((c) => c.name),
  );
  if (!userCols.has("google_id")) raw.exec("ALTER TABLE users ADD COLUMN google_id TEXT");
  if (!userCols.has("avatar_url")) raw.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT");
  if (!userCols.has("auth_provider")) {
    raw.exec("ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'password'");
  }
}
