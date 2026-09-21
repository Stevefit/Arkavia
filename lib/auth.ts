const COOKIE_NAME = "arkavia_admin";
const encoder = new TextEncoder();

export { COOKIE_NAME };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV !== "production") return "arkavia-local-development-secret-only-2026";
  return null;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signature(value: string, keyValue: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(keyValue), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signed));
}

export async function createSessionToken() {
  const keyValue = secret();
  if (!keyValue) throw new Error("SESSION_SECRET must be at least 32 characters in production");
  const value = `v1.${Date.now() + 12 * 60 * 60 * 1000}`;
  return `${value}.${await signature(value, keyValue)}`;
}

export async function verifySessionToken(token: string | undefined) {
  const keyValue = secret();
  if (!token || !keyValue) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const expiry = Number(parts[1]);
  if (!Number.isSafeInteger(expiry) || expiry <= Date.now()) return false;
  const expected = await signature(`${parts[0]}.${parts[1]}`, keyValue);
  const actual = parts[2];
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < actual.length; i++) mismatch |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

export function adminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return process.env.NODE_ENV !== "production" ? "admin123@2003" : null;
}

export async function isAdminRequest(request: Request) {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return verifySessionToken(cookie?.slice(COOKIE_NAME.length + 1));
}

export const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });
