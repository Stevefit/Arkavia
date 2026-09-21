import { isAdminRequest, unauthorized } from "@/lib/auth";
import { deleteComment } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Context) {
  if (!(await isAdminRequest(request))) return unauthorized();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "Invalid comment ID" }, { status: 400 });
  return (await deleteComment(id)) ? new Response(null, { status: 204 }) : Response.json({ error: "Comment not found" }, { status: 404 });
}
