import { getSettings, updateSettings } from "@/lib/store";
import { isAdminRequest, unauthorized } from "@/lib/auth";
import { cleanMusicUrl } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getSettings());
}

export async function PUT(request: Request) {
  if (!(await isAdminRequest(request))) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request" }, { status: 400 });
  const update: { message_template?: string; music_url?: string } = {};
  if ("message_template" in body) {
    if (typeof body.message_template !== "string" || body.message_template.trim().length < 1 || body.message_template.length > 10000) {
      return Response.json({ error: "Template harus berisi 1–10.000 karakter." }, { status: 400 });
    }
    update.message_template = body.message_template.trim();
  }
  if ("music_url" in body) {
    const url = cleanMusicUrl(body.music_url);
    if (url === null) return Response.json({ error: "Gunakan URL audio HTTP atau HTTPS yang valid." }, { status: 400 });
    update.music_url = url;
  }
  if (!Object.keys(update).length) return Response.json({ error: "Nothing to update" }, { status: 400 });
  return Response.json(await updateSettings(update));
}
