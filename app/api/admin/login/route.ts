import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminPassword, COOKIE_NAME, createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const configured = adminPassword();
  if (!configured) return Response.json({ error: "Admin password is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const entered = typeof body?.password === "string" ? body.password : "";
  const actual = createHash("sha256").update(entered).digest();
  const expected = createHash("sha256").update(configured).digest();
  if (!timingSafeEqual(actual, expected)) return Response.json({ error: "Password salah. Silakan coba lagi." }, { status: 401 });
  try {
    const token = await createSessionToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 12 * 60 * 60,
    });
    return response;
  } catch {
    return Response.json({ error: "Session secret is not configured." }, { status: 503 });
  }
}
