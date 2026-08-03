import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

// ── Database location ─────────────────────────────────────────────────────────
// In the Runable sandbox, DATABASE_URL points at a managed Turso instance.
// On a plain Railway deploy there is no Turso, so fall back to a local SQLite
// file that lives on the same persistent volume as categories.json. Without
// this fallback createClient() throws "URL_INVALID: The URL '' is not in a
// valid format" at import time and the container never boots.
const _dbDir: string = (typeof (import.meta as any).dir === "string")
  ? (import.meta as any).dir
  : path.dirname(new URL(import.meta.url).pathname);

function resolveDatabaseUrl(): string {
  const configured = process.env.DATABASE_URL?.trim();
  if (configured) return configured;

  const dataDir = process.env.DATA_DIR ?? path.resolve(_dbDir, "../../../data");
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, "auth.db");
  console.log(`[db] DATABASE_URL not set — using local SQLite at ${file}`);
  return `file:${file}`;
}

const url = resolveDatabaseUrl();

const client = createClient({
  url,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

// ── Schema bootstrap (file-backed SQLite only) ────────────────────────────────
// There are no checked-in migrations — the managed Turso DB is provisioned with
// `bun run db:push`. For a self-hosted SQLite file we create the Better Auth
// tables ourselves. Every statement is IF NOT EXISTS, so this is a no-op once
// the volume has been initialised.
const AUTH_DDL = [
  `CREATE TABLE IF NOT EXISTS user (
    id text PRIMARY KEY NOT NULL,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    email_verified integer DEFAULT 0 NOT NULL,
    image text,
    created_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
    updated_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS session (
    id text PRIMARY KEY NOT NULL,
    expires_at integer NOT NULL,
    token text NOT NULL UNIQUE,
    created_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
    updated_at integer NOT NULL,
    ip_address text,
    user_agent text,
    user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS session_userId_idx ON session (user_id)`,
  `CREATE TABLE IF NOT EXISTS account (
    id text PRIMARY KEY NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at integer,
    refresh_token_expires_at integer,
    scope text,
    password text,
    created_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS account_userId_idx ON account (user_id)`,
  `CREATE TABLE IF NOT EXISTS verification (
    id text PRIMARY KEY NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at integer NOT NULL,
    created_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
    updated_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier)`,
];

export const authSchemaReady: Promise<void> = url.startsWith("file:")
  ? (async () => {
      try {
        for (const stmt of AUTH_DDL) await client.execute(stmt);
        console.log("[db] Auth schema ready");
      } catch (e) {
        console.error("[db] Failed to bootstrap auth schema:", e);
      }
    })()
  : Promise.resolve();
