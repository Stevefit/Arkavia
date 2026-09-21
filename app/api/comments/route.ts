import { createHmac } from "node:crypto";
import { addComment, listComments, listDjs } from "@/lib/store";
import { cleanMessage, cleanName } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("page") || "1";
  const page = Number(raw);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) return Response.json({ error: "Invalid page" }, { status: 400 });
  return Response.json(await listComments(page));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.honeypot === "string" && body.honeypot.trim()) return Response.json({ ignored: true }, { status: 201 });
  const name = cleanName(body?.name);
  const message = cleanMessage(body?.message);
  if (!name || !message) return Response.json({ error: "Nama wajib diisi (maks. 60 karakter) dan pesan harus 1–500 karakter." }, { status: 400 });

  let djId: number | null = null;
  if (body.dj_id !== undefined && body.dj_id !== null) {
    djId = Number(body.dj_id);
    if (!Number.isSafeInteger(djId) || djId < 1 || !(await listDjs()).some((dj) => dj.id === djId)) {
      return Response.json({ error: "DJ tidak ditemukan." }, { status: 400 });
    }
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const key = process.env.SESSION_SECRET || "local-only-comment-salt";
  const ipHash = createHmac("sha256", key).update(ip).digest("hex");
  const result = await addComment({ dj_id: djId, name, message, ip_hash: ipHash });
  if (result === "cooldown") return Response.json({ error: "Tunggu 30 detik sebelum mengirim pesan lagi." }, { status: 429 });
  return Response.json(result, { status: 201 });
}
