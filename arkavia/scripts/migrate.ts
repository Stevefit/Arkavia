import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { DEFAULT_TEMPLATE } from "../lib/template";
loadEnvConfig(process.cwd());
async function main() {
  if (!process.env.POSTGRES_URL) throw new Error("Set POSTGRES_URL first");
  const sql = neon(process.env.POSTGRES_URL);
  await sql.transaction([
    sql`CREATE TABLE IF NOT EXISTS djs(id serial PRIMARY KEY,name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 80),slug text UNIQUE NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`,
    sql`CREATE UNIQUE INDEX IF NOT EXISTS djs_name_unique ON djs(lower(trim(name)))`,
    sql`CREATE TABLE IF NOT EXISTS settings(key text PRIMARY KEY,value text NOT NULL)`,
    sql`CREATE TABLE IF NOT EXISTS login_limits(key text PRIMARY KEY,attempts integer NOT NULL,reset_at timestamptz NOT NULL)`,
    sql`INSERT INTO settings(key,value) VALUES ('message_template',${DEFAULT_TEMPLATE}) ON CONFLICT(key) DO NOTHING`,
  ]);
  console.log("Migration complete. Existing messages and DJs preserved.");
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
