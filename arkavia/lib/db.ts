import { neon } from "@neondatabase/serverless";
export function db() {
  if (!process.env.POSTGRES_URL) throw new Error("Database is not configured");
  return neon(process.env.POSTGRES_URL);
}
export type DJ = { id: number; name: string; slug: string; created_at: string };
export async function findDJ(name: string) {
  const sql = db();
  const rows =
    await sql`SELECT name,slug FROM djs WHERE lower(trim(name))=lower(${name.trim()}) OR lower(slug)=lower(${name.trim()}) LIMIT 1`;
  return rows[0] as Pick<DJ, "name" | "slug"> | undefined;
}
export async function getTemplate() {
  const sql = db();
  const rows =
    await sql`SELECT value FROM settings WHERE key='message_template'`;
  if (!rows[0]) throw new Error("Run the database migration");
  return rows[0].value as string;
}
