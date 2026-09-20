import { randomUUID } from "node:crypto";
import { db, findDJ } from "@/lib/db";
import {
  body,
  requireAdmin,
  sameOrigin,
  response,
  failure,
  nameValue,
  HttpError,
} from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const name = new URL(req.url).searchParams.get("name");
    if (name !== null) {
      const dj = await findDJ(nameValue(name));
      return dj
        ? response(dj)
        : response({ error: "DJ tidak ditemukan." }, 404);
    }
    await requireAdmin();
    return response(
      await db()`SELECT * FROM djs ORDER BY created_at DESC,id DESC`,
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const name = nameValue((await body(req)).name);
    const base =
      name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "dj";
    const sql = db();
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = attempt ? base + "-" + randomUUID().slice(0, 8) : base;
      try {
        const [, rows] = await sql.transaction([
          sql`SELECT pg_advisory_xact_lock(781245)`,
          sql`INSERT INTO djs(name,slug) SELECT ${name},${slug} WHERE NOT EXISTS (SELECT 1 FROM djs WHERE lower(name)=lower(${name}) OR lower(slug)=lower(${name}) OR lower(name)=lower(${slug})) RETURNING *`,
        ]);
        if (!rows[0]) throw new HttpError(409, "Nama sudah digunakan.");
        return response(rows[0], 201);
      } catch (e) {
        if ((e as { code?: string }).code === "23505") {
          if ((e as { constraint?: string }).constraint === "djs_name_unique")
            throw new HttpError(409, "Nama sudah digunakan.");
          continue;
        }
        throw e;
      }
    }
    throw new HttpError(409, "Slug tidak tersedia.");
  } catch (e) {
    return failure(e);
  }
}
