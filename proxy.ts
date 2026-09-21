import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/admin/login" || path === "/api/admin/login") return NextResponse.next();
  if (path === "/api/settings" && request.method === "GET") return NextResponse.next();
  if (path === "/api/comments" && ["GET", "POST"].includes(request.method)) return NextResponse.next();
  if (path === "/api/djs" && request.method === "GET" && request.nextUrl.searchParams.has("name")) return NextResponse.next();

  const valid = await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if (valid) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/djs/:path*", "/api/settings", "/api/comments/:path*", "/api/music/:path*", "/api/admin/logout"],
};
