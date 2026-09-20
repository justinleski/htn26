import assert from "node:assert/strict";
import test from "node:test";
import { beginStandaloneOAuth, completeStandaloneOAuth } from "../app/lib/standalone-oauth.server.js";
import { createStandaloneAuth } from "../src/auth/standalone.js";

const origin = "https://copilot.example";
const shop = "test-store.myshopify.com";

test("standalone authentication ignores retired bearer and query credentials", async () => {
  const auth = createStandaloneAuth({
    apiKey: "test-key", apiSecretKey: "test-secret", appUrl: origin, scopes: ["read_products"],
    storage: {
      async loadSession() { throw new Error("Retired tokens must not select a stored session"); },
      async storeSession() { return true; },
      async deleteSession() { return true; },
    },
  });
  for (const request of [
    new Request(`${origin}/api/dashboard?token=old-token`),
    new Request(`${origin}/api/dashboard`, { headers: { Authorization: "Bearer old-token" } }),
  ]) {
    assert.equal(await auth.currentSession(request), undefined);
    await assert.rejects(auth.requireSession(request), (error: unknown) => error instanceof Response && error.status === 401);
  }
});

test("legacy login redirects to canonical cookie OAuth without forwarding old credentials", async () => {
  const previous = process.env.SHOPIFY_APP_URL;
  process.env.SHOPIFY_APP_URL = origin;
  try {
    await assert.rejects(beginStandaloneOAuth(new Request("https://old-api.example/auth/copilot?token=old-token"), shop), (response: unknown) => {
      assert.ok(response instanceof Response);
      assert.equal(response.status, 303);
      assert.equal(response.headers.get("Location"), `${origin}/api/auth/start?shop=${shop}`);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert.equal(response.headers.get("Set-Cookie"), null);
      return true;
    });
  } finally {
    if (previous === undefined) delete process.env.SHOPIFY_APP_URL;
    else process.env.SHOPIFY_APP_URL = previous;
  }
});

test("old callbacks restart sign-in instead of exchanging codes or issuing bearer tokens", async () => {
  const previous = process.env.SHOPIFY_APP_URL;
  process.env.SHOPIFY_APP_URL = origin;
  try {
    const response = await completeStandaloneOAuth(new Request(`https://old-api.example/auth/callback?shop=${shop}&code=old-code&state=old-state&hmac=old-hmac&token=old-token`));
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("Location"), `${origin}/api/auth/start?shop=${shop}`);
    assert.equal(response.headers.get("Set-Cookie"), null);
    const missingShop = await completeStandaloneOAuth(new Request("https://old-api.example/auth/callback?token=old-token"));
    assert.equal(missingShop.headers.get("Location"), `${origin}/`);
    await assert.rejects(beginStandaloneOAuth(new Request(origin), "attacker.example"), (error: unknown) => error instanceof Response && error.status === 400);
    await assert.rejects(completeStandaloneOAuth(new Request("https://old-api.example/auth/callback?shop=attacker.example")), (error: unknown) => error instanceof Response && error.status === 400);
  } finally {
    if (previous === undefined) delete process.env.SHOPIFY_APP_URL;
    else process.env.SHOPIFY_APP_URL = previous;
  }
});
