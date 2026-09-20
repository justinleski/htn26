import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { setAbstractFetchFunc } from "@shopify/shopify-api/runtime";
import type { Session } from "@shopify/shopify-api";
import { createStandaloneAuth, normalizeShop, requireSameOrigin } from "../src/auth/standalone.js";

const secret = "test-secret-not-real";
const origin = "https://copilot.example";
const shop = "test-store.myshopify.com";
const userAgent = "Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36";
function setup() {
  const sessions = new Map<string, Session>();
  const auth = createStandaloneAuth({ apiKey: "test-key", apiSecretKey: secret, appUrl: origin, scopes: ["read_products"], storage: {
    async loadSession(id) { return sessions.get(id); },
    async storeSession(session) { sessions.set(session.id, session); return true; },
    async deleteSession(id) { sessions.delete(id); return true; },
  } });
  return { auth, sessions };
}
function cookieHeader(response: Response) { return response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; "); }
function request(path: string, cookie = "") { return new Request(`${origin}${path}`, { headers: { "User-Agent": userAgent, Cookie: cookie } }); }
function callbackUrl(state: string) {
  const values = { code: "test-code", shop, state, timestamp: String(Math.floor(Date.now() / 1000)) };
  const message = Object.entries(values).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("&");
  return `/api/auth/callback?${message}&hmac=${createHmac("sha256", secret).update(message).digest("hex")}`;
}
test("shop domain validation rejects redirects, paths, and non-Shopify hosts", () => {
  assert.equal(normalizeShop(" Test-Store.myshopify.com "), shop);
  for (const value of ["evil.com", "test.myshopify.com.evil.com", "test.myshopify.com/admin", "https://test.myshopify.com", "test.myshopify.com@evil.com"]) assert.throws(() => normalizeShop(value));
});
test("mutations require the exact configured origin", () => {
  assert.doesNotThrow(() => requireSameOrigin(new Request(origin, { headers: { Origin: origin } }), origin));
  for (const other of ["https://evil.com", "null", ""]) assert.throws(() => requireSameOrigin(new Request(origin, { headers: { Origin: other } }), origin));
});
test("OAuth requests online access, binds a signed state cookie, and validates callback HMAC", async () => {
  const { auth, sessions } = setup();
  const start = await auth.start(request(`/api/auth/start?shop=${shop}`));
  const url = new URL(start.headers.get("Location")!);
  assert.equal(url.origin, `https://${shop}`);
  assert.equal(url.searchParams.get("redirect_uri"), `${origin}/api/auth/callback`);
  assert.equal(url.searchParams.get("grant_options[]"), "per-user");
  assert.ok(start.headers.getSetCookie().every((cookie) => /HttpOnly/i.test(cookie) && /secure/i.test(cookie)));
  const state = url.searchParams.get("state")!;
  const cookies = cookieHeader(start);
  let exchanges = 0;
  setAbstractFetchFunc(async () => {
    exchanges++;
    return Response.json({ access_token: "never-return-this-token", scope: "read_products", expires_in: 3600,
      associated_user_scope: "read_products", associated_user: { id: 123, first_name: "Test", last_name: "User", email: "test@example.com", email_verified: true, account_owner: true, locale: "en", collaborator: false } });
  });
  try {
    await assert.rejects(auth.callback(request(callbackUrl(state))));
    await assert.rejects(auth.callback(request(callbackUrl("wrong-state"), cookies)));
    await assert.rejects(auth.callback(request(callbackUrl(state).replace(/hmac=.*/, "hmac=invalid"), cookies)));
    assert.equal(exchanges, 0);
    const callback = await auth.callback(request(callbackUrl(state), cookies));
    assert.equal(callback.status, 302);
    assert.equal(callback.headers.get("Location"), `${origin}/dashboard`);
    assert.equal(sessions.size, 1);
    assert.ok(!callback.headers.get("Set-Cookie")!.includes("never-return-this-token"));
    assert.ok(callback.headers.getSetCookie().every((cookie) => /HttpOnly/i.test(cookie)));
    const authenticated = request("/api/session", cookieHeader(callback));
    assert.equal((await auth.requireSession(authenticated)).shop, shop);
    assert.equal(await auth.currentSession(request("/api/session", "shopify_app_session=forged; shopify_app_session.sig=forged")), undefined);
    const session = [...sessions.values()][0]!;
    session.expires = new Date(0);
    assert.equal(await auth.currentSession(authenticated), undefined);
    session.expires = new Date(Date.now() + 60000);
    await auth.logout(authenticated);
    assert.equal(sessions.size, 0);
    await assert.rejects(auth.requireSession(authenticated), (error: unknown) => error instanceof Response && error.status === 401);
  } finally { setAbstractFetchFunc(fetch); }
});
