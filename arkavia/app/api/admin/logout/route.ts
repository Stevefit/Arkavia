import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/auth";
import { requireAdmin, sameOrigin, failure } from "@/lib/http";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (e) {
    return failure(e);
  }
}
