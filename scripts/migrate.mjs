import { neon } from "@neondatabase/serverless";

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Set POSTGRES_URL or DATABASE_URL before running the migration.");
  process.exit(1);
}

const sql = neon(url);
await sql`CREATE TABLE IF NOT EXISTS djs (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
)`;
await sql`CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL
)`;
await sql`CREATE TABLE IF NOT EXISTS comments (
  id serial PRIMARY KEY,
  dj_id integer REFERENCES djs(id) ON DELETE SET NULL,
  name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
)`;
await sql`CREATE INDEX IF NOT EXISTS comments_created_at_idx ON comments (created_at DESC, id DESC)`;
await sql`CREATE TABLE IF NOT EXISTS comment_cooldowns (
  ip_hash text PRIMARY KEY,
  last_posted_at timestamptz NOT NULL
)`;

const { DEFAULT_MESSAGE } = await import("../lib/default-message.mjs");
await sql`INSERT INTO settings (key, value) VALUES ('message_template', ${DEFAULT_MESSAGE}) ON CONFLICT (key) DO NOTHING`;
await sql`INSERT INTO settings (key, value) VALUES ('music_url', '') ON CONFLICT (key) DO NOTHING`;
console.log("ARKAVIA database migrated and settings seeded.");
