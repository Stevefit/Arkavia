import { db } from "@/lib/db";
import {
  body,
  requireAdmin,
  sameOrigin,
  response,
  failure,
  nameValue,
  HttpError,
} from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
async function idValue(ctx: Context) {
  const { id } = await ctx.params;
  if (
    !/^\d+$/.test(id) ||
    !Number.isSafeInteger(Number(id)) ||
    Number(id) > 2147483647
  )
    throw new HttpError(400, "ID tidak valid.");
  return Number(id);
}
export async function PUT(req: Request, ctx: Context) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const id = await idValue(ctx);
    const name = nameValue((await body(req)).name);
    const sql = db();
    const [, rows] = await sql.transaction([
      sql`SELECT pg_advisory_xact_lock(781245)`,
      sql`UPDATE djs SET name=${name} WHERE id=${id} AND NOT EXISTS (SELECT 1 FROM djs other WHERE other.id<>${id} AND (lower(other.name)=lower(${name}) OR lower(other.slug)=lower(${name}))) RETURNING *`,
    ]);
    if (!rows[0])
      throw new HttpError(409, "DJ tidak ditemukan atau nama sudah digunakan.");
    return response(rows[0]);
  } catch (e) {
    if ((e as { code?: string }).code === "23505")
      return response({ error: "Nama sudah digunakan." }, 409);
    return failure(e);
  }
}
export async function DELETE(req: Request, ctx: Context) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const id = await idValue(ctx);
    const rows = await db()`DELETE FROM djs WHERE id=${id} RETURNING id`;
    if (!rows[0]) throw new HttpError(404, "DJ tidak ditemukan.");
    return response({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
