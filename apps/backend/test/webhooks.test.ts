import "@shopify/shopify-api/adapters/web-api";
import assert from "node:assert/strict";
import test from "node:test";
import { ApiVersion, LogSeverity, Session, shopifyApi } from "@shopify/shopify-api";
import { setAbstractFetchFunc } from "@shopify/shopify-api/runtime";
import { ensureUninstallWebhook } from "../src/auth/webhooks.js";

const origin = "https://copilot.example";
const api = shopifyApi({ apiKey: "test-key", apiSecretKey: "test-secret", hostName: "copilot.example",
  apiVersion: ApiVersion.July26, isEmbeddedApp: false, logger: { level: LogSeverity.Error } });
const session = new Session({ id: "test", shop: "test.myshopify.com", state: "", isOnline: true, accessToken: "test-only" });
const present = { data: { webhookSubscriptions: { nodes: [{ id: "existing" }] } } };
const missing = { data: { webhookSubscriptions: { nodes: [] } } };

async function run(responses: unknown[]) {
  const calls: { query: string; variables: Record<string, unknown> }[] = [];
  setAbstractFetchFunc(async (_url, init) => {
    calls.push(JSON.parse(String(init?.body)));
    assert.ok(responses.length, "Unexpected GraphQL request");
    return Response.json(responses.shift());
  });
  try { await ensureUninstallWebhook(api, session, origin); return calls; }
  finally { setAbstractFetchFunc(fetch); }
}

test("existing exact uninstall subscription avoids mutations", async () => {
  const calls = await run([present]);
  assert.equal(calls.length, 1);
  assert.match(calls[0]!.query, /topics: \[APP_UNINSTALLED\]/);
  assert.deepEqual(calls[0]!.variables, { uri: `${origin}/webhooks/app/uninstalled` });
});

test("missing uninstall subscription creates only the canonical JSON endpoint", async () => {
  const calls = await run([missing, { data: { webhookSubscriptionCreate: { webhookSubscription: { id: "created" }, userErrors: [] } } }]);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1]!.variables, { subscription: { uri: `${origin}/webhooks/app/uninstalled`, format: "JSON" } });
  assert.match(calls[1]!.query, /topic: APP_UNINSTALLED/);
  assert.ok(calls.every((call) => !/Delete|Update/.test(call.query)));
});

test("concurrent duplicate creation succeeds only when the exact subscription now exists", async () => {
  const duplicate = { data: { webhookSubscriptionCreate: { webhookSubscription: null, userErrors: [{ message: "Already exists" }] } } };
  assert.equal((await run([missing, duplicate, present])).length, 3);
  await assert.rejects(run([missing, duplicate, missing]), /Could not register uninstall webhook/);
});

test("missing subscription response fails closed", async () => {
  await assert.rejects(run([{ data: {} }]), /Could not verify uninstall webhook/);
});
