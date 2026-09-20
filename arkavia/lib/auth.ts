import { SignJWT, jwtVerify } from "jose";
export const COOKIE = "arkavia_session";
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32)
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(s);
}
export async function signSession() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("arkavia")
    .setAudience("arkavia-admin")
    .setExpirationTime("8h")
    .sign(secret());
}
export async function validSession(token?: string) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: "arkavia",
      audience: "arkavia-admin",
    });
    return payload.role === "admin";
  } catch {
    return false;
  }
}
