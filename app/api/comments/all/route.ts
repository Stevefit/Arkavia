import { isAdminRequest, unauthorized } from "@/lib/auth";
import { listAllComments } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return unauthorized();
  return Response.json(await listAllComments());
}
