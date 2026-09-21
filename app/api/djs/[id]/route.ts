import { deleteDj, updateDj } from "@/lib/store";
import { isAdminRequest, unauthorized } from "@/lib/auth";
import { cleanName } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  if (!(await isAdminRequest(request))) return unauthorized();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "Invalid DJ ID" }, { status: 400 });
  const body = await request.json().catch(() => null);
  const name = cleanName(body?.name);
  if (!name) return Response.json({ error: "Nama DJ harus berisi 1–60 karakter." }, { status: 400 });
  const dj = await updateDj(id, name);
  return dj ? Response.json(dj) : Response.json({ error: "DJ not found" }, { status: 404 });
}

export async function DELETE(request: Request, { params }: Context) {
  if (!(await isAdminRequest(request))) return unauthorized();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "Invalid DJ ID" }, { status: 400 });
  return (await deleteDj(id)) ? new Response(null, { status: 204 }) : Response.json({ error: "DJ not found" }, { status: 404 });
}
