import assert from "node:assert/strict";
import test from "node:test";
import { handleApiRequest } from "../app/lib/api.server.js";
import { signCopilotSession } from "../app/lib/copilot-session.server.js";

const secret = "test-session-secret-for-api-auth";

test("API request without a token returns 401", async () => {
  process.env.SESSION_SECRET = secret;
  const response = await handleApiRequest(
    new Request("http://localhost/api/session"),
    async () => Response.json({ ok: true }),
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});

test("API request with a bad token returns 401", async () => {
  process.env.SESSION_SECRET = secret;
  const response = await handleApiRequest(
    new Request("http://localhost/api/dashboard", {
      headers: { Authorization: "Bearer not-a-real-token" },
    }),
    async () => Response.json({ ok: true }),
  );
  assert.equal(response.status, 401);
});

test("API request with a valid Bearer token reaches the handler", async () => {
  process.env.SESSION_SECRET = secret;
  const token = signCopilotSession({
    shop: "htn26-rain-jackets.myshopify.com",
    merchantId: "merchant_123",
  });
  const response = await handleApiRequest(
    new Request("http://localhost/api/session", {
      headers: { Authorization: `Bearer ${token}` },
    }),
    async ({ session }) =>
      Response.json({
        connected: true,
        shop: session.shop,
        storeName: "Rain Jackets",
      }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    connected: true,
    shop: "htn26-rain-jackets.myshopify.com",
    storeName: "Rain Jackets",
  });
});
