import { createDj, findDj, listDjs } from "@/lib/store";
import { isAdminRequest, unauthorized } from "@/lib/auth";
import { cleanName } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("name");
  if (value !== null) {
    if (!value.trim() || value.length > 100) return Response.json({ error: "DJ not found" }, { status: 404 });
    const dj = await findDj(value.trim());
    return dj ? Response.json(dj) : Response.json({ error: "DJ not found" }, { status: 404 });
  }
  if (!(await isAdminRequest(request))) return unauthorized();
  return Response.json(await listDjs());
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return unauthorized();
  const body = await request.json().catch(() => null);
  const name = cleanName(body?.name);
  if (!name) return Response.json({ error: "Nama DJ harus berisi 1–60 karakter." }, { status: 400 });
  return Response.json(await createDj(name), { status: 201 });
}
