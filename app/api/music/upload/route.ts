import { put } from "@vercel/blob";
import { isAdminRequest, unauthorized } from "@/lib/auth";

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return unauthorized();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "Vercel Blob belum dikonfigurasi." }, { status: 503 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.type.startsWith("audio/") || file.size > 4 * 1024 * 1024 || file.size === 0) {
    return Response.json({ error: "Pilih file audio maksimal 4 MB." }, { status: 400 });
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
  const blob = await put(`arkavia-music/${safeName}`, file, { access: "public", addRandomSuffix: true });
  return Response.json({ url: blob.url });
}
