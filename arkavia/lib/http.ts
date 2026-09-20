import { cookies } from "next/headers";
import { COOKIE, validSession } from "./auth";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireAdmin() {
  if (!(await validSession((await cookies()).get(COOKIE)?.value)))
    throw new HttpError(401, "Silakan login kembali.");
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin)
    throw new HttpError(403, "Origin tidak diizinkan.");
}
export function response(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function failure(e: unknown) {
  if (e instanceof HttpError) return response({ error: e.message }, e.status);
  console.error(
    "Request failed",
    e instanceof Error ? e.message : "Unknown error",
  );
  return response({ error: "Layanan belum tersedia. Silakan coba lagi." }, 503);
}
export async function body(req: Request) {
  const text = await req.text();
  if (text.length > 25000) throw new HttpError(413, "Data terlalu panjang.");
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error();
    return parsed;
  } catch {
    throw new HttpError(400, "JSON tidak valid.");
  }
}
export function nameValue(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 80)
    throw new HttpError(400, "Nama harus berisi 1–80 karakter.");
  return value.trim();
}
