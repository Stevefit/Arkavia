import { db, getTemplate } from "@/lib/db";
import {
  body,
  requireAdmin,
  sameOrigin,
  response,
  failure,
  HttpError,
} from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return response({ value: await getTemplate() });
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(req: Request) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const { value } = await body(req);
    if (typeof value !== "string" || !value.trim() || value.length > 10000)
      throw new HttpError(400, "Pesan harus berisi 1–10.000 karakter.");
    await db()`INSERT INTO settings(key,value) VALUES ('message_template',${value}) ON CONFLICT(key) DO UPDATE SET value=excluded.value`;
    return response({ value });
  } catch (e) {
    return failure(e);
  }
}
