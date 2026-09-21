import { NextResponse } from "next/server";
import { COOKIE_NAME, isAdminRequest, unauthorized } from "@/lib/auth";

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return unauthorized();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
