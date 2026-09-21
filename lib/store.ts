import { neon } from "@neondatabase/serverless";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULT_SETTINGS } from "./defaults";
import type { Dj, GuestComment, Settings } from "./types";

type LocalData = {
  djs: Dj[];
  settings: Settings;
  comments: GuestComment[];
  cooldowns: Record<string, number>;
};

const localPath = path.join(process.cwd(), "data", "local.json");
let localQueue: Promise<unknown> = Promise.resolve();

function databaseUrl() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url && process.env.NODE_ENV === "production") throw new Error("POSTGRES_URL is required in production");
  return url;
}

function sqlClient() {
  const url = databaseUrl();
  return url ? neon(url) : null;
}

async function readLocal(): Promise<LocalData> {
  try {
    return JSON.parse(await fs.readFile(localPath, "utf8")) as LocalData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const initial: LocalData = {
      djs: [{ id: 1, name: "Rein", slug: "rein", created_at: new Date().toISOString() }],
      settings: { ...DEFAULT_SETTINGS },
      comments: [],
      cooldowns: {},
    };
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, JSON.stringify(initial, null, 2));
    return initial;
  }
}

async function changeLocal<T>(change: (data: LocalData) => T | Promise<T>): Promise<T> {
  const result = localQueue.then(async () => {
    const data = await readLocal();
    const value = await change(data);
    const temp = `${localPath}.tmp`;
    await fs.writeFile(temp, JSON.stringify(data, null, 2));
    await fs.rename(temp, localPath);
    return value;
  });
  localQueue = result.then(() => undefined, () => undefined);
  return result;
}

function iso(value: unknown) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function djRow(row: Record<string, unknown>): Dj {
  return { id: Number(row.id), name: String(row.name), slug: String(row.slug), created_at: iso(row.created_at) };
}

function commentRow(row: Record<string, unknown>): GuestComment {
  return {
    id: Number(row.id), dj_id: row.dj_id == null ? null : Number(row.dj_id),
    dj_name: row.dj_name == null ? null : String(row.dj_name),
    name: String(row.name), message: String(row.message), created_at: iso(row.created_at),
  };
}

export function slugify(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "dj";
}

export async function findDj(value: string): Promise<Dj | null> {
  const sql = sqlClient();
  if (sql) {
    const bySlug = await sql`SELECT id, name, slug, created_at FROM djs WHERE slug = ${value.toLowerCase()} LIMIT 1`;
    if (bySlug.length) return djRow(bySlug[0]);
    const byName = await sql`SELECT id, name, slug, created_at FROM djs WHERE lower(name) = lower(${value}) ORDER BY id LIMIT 1`;
    return byName.length ? djRow(byName[0]) : null;
  }
  const data = await readLocal();
  return data.djs.find((dj) => dj.slug === value.toLowerCase()) || data.djs.find((dj) => dj.name.toLowerCase() === value.toLowerCase()) || null;
}

export async function listDjs(): Promise<Dj[]> {
  const sql = sqlClient();
  if (sql) return (await sql`SELECT id, name, slug, created_at FROM djs ORDER BY created_at DESC, id DESC`).map(djRow);
  return (await readLocal()).djs.toReversed();
}

export async function createDj(name: string): Promise<Dj> {
  const base = slugify(name);
  const sql = sqlClient();
  if (sql) {
    for (let suffix = 1; suffix < 10000; suffix++) {
      const slug = suffix === 1 ? base : `${base}-${suffix}`;
      const rows = await sql`INSERT INTO djs (name, slug) VALUES (${name}, ${slug}) ON CONFLICT (slug) DO NOTHING RETURNING id, name, slug, created_at`;
      if (rows.length) return djRow(rows[0]);
    }
    throw new Error("Could not allocate a unique DJ link");
  }
  return changeLocal((data) => {
    let suffix = 1;
    let slug = base;
    while (data.djs.some((dj) => dj.slug === slug)) slug = `${base}-${++suffix}`;
    const dj = { id: Math.max(0, ...data.djs.map((item) => item.id)) + 1, name, slug, created_at: new Date().toISOString() };
    data.djs.push(dj);
    return dj;
  });
}

export async function updateDj(id: number, name: string): Promise<Dj | null> {
  const sql = sqlClient();
  if (sql) {
    const rows = await sql`UPDATE djs SET name = ${name} WHERE id = ${id} RETURNING id, name, slug, created_at`;
    return rows.length ? djRow(rows[0]) : null;
  }
  return changeLocal((data) => {
    const dj = data.djs.find((item) => item.id === id);
    if (dj) dj.name = name;
    return dj || null;
  });
}

export async function deleteDj(id: number) {
  const sql = sqlClient();
  if (sql) {
    const rows = await sql`DELETE FROM djs WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  }
  return changeLocal((data) => {
    const before = data.djs.length;
    data.djs = data.djs.filter((dj) => dj.id !== id);
    for (const comment of data.comments) if (comment.dj_id === id) comment.dj_id = null;
    return before !== data.djs.length;
  });
}

export async function getSettings(): Promise<Settings> {
  const sql = sqlClient();
  if (sql) {
    const rows = await sql`SELECT key, value FROM settings WHERE key IN ('message_template', 'music_url')`;
    return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((row) => [String(row.key), String(row.value)])) };
  }
  return (await readLocal()).settings;
}

export async function updateSettings(update: Partial<Settings>): Promise<Settings> {
  const sql = sqlClient();
  if (sql) {
    if (update.message_template !== undefined) await sql`INSERT INTO settings (key, value) VALUES ('message_template', ${update.message_template}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    if (update.music_url !== undefined) await sql`INSERT INTO settings (key, value) VALUES ('music_url', ${update.music_url}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    return getSettings();
  }
  return changeLocal((data) => {
    data.settings = { ...data.settings, ...update };
    return data.settings;
  });
}

export async function listComments(page: number, limit = 10) {
  const sql = sqlClient();
  if (sql) {
    const rows = await sql`SELECT c.id, c.dj_id, d.name AS dj_name, c.name, c.message, c.created_at FROM comments c LEFT JOIN djs d ON d.id = c.dj_id ORDER BY c.created_at DESC, c.id DESC LIMIT ${limit + 1} OFFSET ${(page - 1) * limit}`;
    return { comments: rows.slice(0, limit).map(commentRow), hasMore: rows.length > limit };
  }
  const data = await readLocal();
  const sorted = data.comments.toSorted((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  const start = (page - 1) * limit;
  return {
    comments: sorted.slice(start, start + limit).map((comment) => ({
      ...comment,
      dj_name: data.djs.find((dj) => dj.id === comment.dj_id)?.name || null,
    })),
    hasMore: sorted.length > start + limit,
  };
}

export async function listAllComments(): Promise<GuestComment[]> {
  const sql = sqlClient();
  if (sql) return (await sql`SELECT c.id, c.dj_id, d.name AS dj_name, c.name, c.message, c.created_at FROM comments c LEFT JOIN djs d ON d.id = c.dj_id ORDER BY c.created_at DESC, c.id DESC`).map(commentRow);
  return (await listComments(1, Number.MAX_SAFE_INTEGER)).comments;
}

export async function addComment(input: { dj_id: number | null; name: string; message: string; ip_hash: string }): Promise<GuestComment | "cooldown"> {
  const sql = sqlClient();
  if (sql) {
    const allowed = await sql`INSERT INTO comment_cooldowns (ip_hash, last_posted_at) VALUES (${input.ip_hash}, now()) ON CONFLICT (ip_hash) DO UPDATE SET last_posted_at = now() WHERE comment_cooldowns.last_posted_at < now() - interval '30 seconds' RETURNING ip_hash`;
    if (!allowed.length) return "cooldown";
    const rows = await sql`INSERT INTO comments (dj_id, name, message) VALUES (${input.dj_id}, ${input.name}, ${input.message}) RETURNING id, dj_id, name, message, created_at`;
    return commentRow(rows[0]);
  }
  return changeLocal((data) => {
    const last = data.cooldowns[input.ip_hash] || 0;
    if (Date.now() - last < 30000) return "cooldown";
    data.cooldowns[input.ip_hash] = Date.now();
    const comment: GuestComment = {
      id: Math.max(0, ...data.comments.map((item) => item.id)) + 1,
      dj_id: input.dj_id, name: input.name, message: input.message, created_at: new Date().toISOString(),
    };
    data.comments.push(comment);
    return comment;
  });
}

export async function deleteComment(id: number) {
  const sql = sqlClient();
  if (sql) {
    const rows = await sql`DELETE FROM comments WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  }
  return changeLocal((data) => {
    const before = data.comments.length;
    data.comments = data.comments.filter((item) => item.id !== id);
    return data.comments.length !== before;
  });
}
