import { NextRequest, NextResponse } from "next/server";
import { COOKIE, validSession } from "./lib/auth";
export async function proxy(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (p === "/admin/login" || p === "/api/admin/login")
    return NextResponse.next();
  const protectedRoute =
    p.startsWith("/admin") ||
    !["GET", "HEAD", "OPTIONS"].includes(req.method) ||
    (p === "/api/djs" && !req.nextUrl.searchParams.has("name"));
  if (protectedRoute && !(await validSession(req.cookies.get(COOKIE)?.value)))
    return p.startsWith("/api/")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/admin/login", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/admin/:path*", "/api/:path*"] };
