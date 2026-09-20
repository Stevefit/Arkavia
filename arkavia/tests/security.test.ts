import test from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { signSession, validSession } from "../lib/auth";
import { personalize } from "../lib/template";
process.env.SESSION_SECRET = "test-only-secret-never-use-in-production-12345";
const key = new TextEncoder().encode(process.env.SESSION_SECRET);
test("accepts a valid session and rejects missing, forged and expired sessions", async () => {
  const token = await signSession();
  assert.equal(await validSession(token), true);
  assert.equal(await validSession(), false);
  assert.equal(await validSession("admin"), false);
  const parts = token.split(".");
  parts[1] = Buffer.from(
    JSON.stringify({ role: "admin", exp: 9999999999 }),
  ).toString("base64url");
  assert.equal(await validSession(parts.join(".")), false);
  const expired = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("arkavia")
    .setAudience("arkavia-admin")
    .setExpirationTime("1 second ago")
    .sign(key);
  assert.equal(await validSession(expired), false);
  const wrongAudience = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("arkavia")
    .setAudience("other")
    .setExpirationTime("1h")
    .sign(key);
  assert.equal(await validSession(wrongAudience), false);
});
test("all name placeholders are replaced without interpreting replacement patterns", () => {
  assert.equal(
    personalize("Hai {name}! DJ {name}", "$& <script>"),
    "Hai $& <script>! DJ $& <script>",
  );
});

test('proxy rejects forged sessions on dashboard and protected API routes', async () => {
 const { NextRequest }=await import('next/server');
 const {proxy}=await import('../proxy');
 for(const [path,method] of [['/api/djs','GET'],['/api/djs','POST'],['/api/template','PUT'],['/api/djs/1','DELETE']]) {
  const response=await proxy(new NextRequest('https://arkavia.example'+path,{method,headers:{Cookie:'arkavia_session=forged'}}));
  assert.equal(response.status,401);
 }
 const page=await proxy(new NextRequest('https://arkavia.example/admin',{headers:{Cookie:'arkavia_session=forged'}}));
 assert.equal(page.status,307);
 assert.equal(page.headers.get('location'),'https://arkavia.example/admin/login');
 const publicLookup=await proxy(new NextRequest('https://arkavia.example/api/djs?name=Rein'));
 assert.equal(publicLookup.status,200);
});
