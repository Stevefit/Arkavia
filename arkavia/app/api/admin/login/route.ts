import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { COOKIE, signSession } from "@/lib/auth";
import { body, sameOrigin, failure, HttpError } from "@/lib/http";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const data = await body(req);
    const password = process.env.ADMIN_PASSWORD;
    if (!password || password.length < 12)
      throw new Error("Set ADMIN_PASSWORD with at least 12 characters");
    // Shared database counter: durable across serverless instances, with a bounded 5-minute lockout.
    const sql = db();
    const rows =
      await sql`INSERT INTO login_limits (key,attempts,reset_at) VALUES ('admin',1,now()+interval '5 minutes') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_limits.reset_at<now() THEN 1 ELSE login_limits.attempts+1 END,reset_at=CASE WHEN login_limits.reset_at<now() THEN now()+interval '5 minutes' ELSE login_limits.reset_at END RETURNING attempts`;
    if (Number(rows[0].attempts) > 20)
      throw new HttpError(
        429,
        "Terlalu banyak percobaan. Coba lagi dalam 5 menit.",
      );
    const digest = (v: string) => createHash("sha256").update(v).digest();
    if (
      typeof data.password !== "string" ||
      !timingSafeEqual(digest(data.password), digest(password))
    )
      throw new HttpError(401, "Password salah.");
    const res = NextResponse.json({ ok: true });
    res.headers.set("Cache-Control", "no-store");
    res.cookies.set(COOKIE, await signSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 28800,
    });
    return res;
  } catch (e) {
    return failure(e);
  }
}
