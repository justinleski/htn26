/** Integration smoke: real Postgres, isolated temporary merchants, scripted model.
 * No Shopify or model network calls. Removes only records created by this run.
 */
import "./load-env";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { setAbstractFetchFunc } from "@shopify/shopify-api/runtime";
import prisma from "../app/db.server";
import { standaloneAuth } from "../app/lib/standalone.server";
import { generateMerchantCampaign } from "../app/lib/campaigns.server";
import { createTextModelClient } from "../src/ai/model.js";
import { loader, action } from "../app/routes/api.$";

const shops = [0, 1].map(() => `smoke-${randomUUID()}.myshopify.com`);
const created: string[] = [];
const auth = standaloneAuth();
const origin = auth.origin;
const userAgent = "Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36";
const cookieHeader = (response: Response) => response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
async function signIn(shop: string) {
  const start = await auth.start(new Request(`${origin}/api/auth/start?shop=${shop}`, { headers: { "User-Agent": userAgent } }));
  const state = new URL(start.headers.get("Location")!).searchParams.get("state")!;
  const params = { code: "smoke-code", shop, state, timestamp: String(Math.floor(Date.now() / 1000)) };
  const message = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("&");
  const hmac = createHmac("sha256", process.env.SHOPIFY_API_SECRET!).update(message).digest("hex");
  const callback = await auth.callback(new Request(`${origin}/api/auth/callback?${message}&hmac=${hmac}`, { headers: { Cookie: cookieHeader(start), "User-Agent": userAgent } }));
  return cookieHeader(callback);
}
async function api(path: string, cookie: string, body?: unknown) {
  const request = new Request(`${origin}/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Cookie: cookie, Origin: process.env.NODE_ENV === "production" ? origin : (process.env.FRONTEND_URL ?? origin), "Content-Type": "application/json", "User-Agent": userAgent },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return (body === undefined ? loader : action)({ request, params: {}, context: {}, url: new URL(request.url), pattern: "/api/*" });
}

try {
  // Disable optional outbound indexing/telemetry for this isolated check.
  process.env.ELASTIC_API_KEY = "";
  process.env.SENTRY_DSN = "";
  for (const shopDomain of shops) {
    const merchant = await prisma.merchant.create({ data: { shopDomain } });
    created.push(merchant.id);
  }
  setAbstractFetchFunc(async (_url, init) => String(init?.body).includes("AdgileUninstallWebhook")
    ? Response.json({ data: { webhookSubscriptions: { nodes: [{ id: "smoke-hook" }] } } })
    : Response.json({ access_token: "smoke-token-not-real", scope: auth.api.config.scopes?.toString(), expires_in: 3600,
    associated_user_scope: auth.api.config.scopes?.toString(), associated_user: { id: 123, first_name: "Smoke", last_name: "Test", email: "smoke@example.com", email_verified: true, account_owner: true, locale: "en", collaborator: false } }));
  const [cookie, otherCookie] = await Promise.all(shops.map(signIn));
  assert.equal((await (await api("session", cookie!)).json()).connected, true);
  assert.equal((await api("import/demo", cookie!, {})).status, 200);
  assert.equal((await api("import/demo", cookie!, {})).status, 200);
  const dashboard = await (await api("dashboard", cookie!)).json();
  assert.equal(dashboard.products.length, 1);
  assert.equal(dashboard.reviews.length, 6);
  assert.equal(dashboard.ads.length, 4);
  assert.equal(dashboard.metrics.hasData, true);
  const productId = dashboard.products[0].id;
  const sourceId = dashboard.reviews[0].sourceId;
  const review = { sourceId: "smoke-review", productId, rating: 5, text: "Useful rain jacket", source: "smoke", reviewedAt: "2026-09-01T00:00:00Z" };
  assert.equal((await api("import", cookie!, { kind: "reviews", format: "json", input: JSON.stringify([review]) })).status, 200);
  assert.equal((await api("import", otherCookie!, { kind: "reviews", format: "json", input: JSON.stringify([review]) })).status, 400);
  let calls = 0;
  const model = createTextModelClient({ async generateText() {
    calls++;
    if (calls === 1) return JSON.stringify({ merchantId: created[0], productId, findings: [{ summary: "Reviewers describe rain protection", supportingSourceIds: [sourceId], observedMetrics: {}, limitations: ["Synthetic smoke check"] }], limitations: ["Synthetic smoke check"] });
    if (calls === 2) return JSON.stringify({ merchantId: created[0], productId, objective: "Smoke campaign", audience: "Commuters", strategy: "Test review-led messaging", hooks: ["Rain protection", "Wet-weather layer", "Ready for rain"], captions: ["Explore this jacket", "Read customer reviews", "Try a rain layer"], variants: [ { name: "A", content: "Rain protection", changedElement: "Hook", hypothesis: "May improve interest" }, { name: "B", content: "Wet-weather layer", changedElement: "Hook", hypothesis: "May change interest" } ], supportingSourceIds: [sourceId], assumptions: ["Synthetic output"], limitations: ["Not a live model test"] });
    return JSON.stringify({ decisions: [{ claim: "Rain protection", status: "supported", sourceIds: [sourceId], reason: "Synthetic claim-check response" }] });
  } });
  const campaign = await generateMerchantCampaign(shops[0]!, productId, model);
  assert.equal(calls, 3);
  assert.equal((await api(`campaigns/${campaign.id}`, cookie!)).status, 200);
  assert.equal((await (await api(`campaigns/${campaign.id}`, cookie!)).json()).objective, "Smoke campaign");
  assert.equal((await api(`campaigns/${campaign.id}`, otherCookie!)).status, 404);
  assert.equal((await (await api("campaigns", cookie!)).json()).length, 1);
  assert.equal((await (await api("campaigns", otherCookie!)).json()).length, 0);
  assert.equal((await prisma.generationRun.findFirstOrThrow({ where: { campaignId: campaign.id } })).status, "succeeded");
  await api("logout", cookie!, {});
  assert.equal((await api("dashboard", cookie!)).status, 401);
  console.log("PASS: OAuth session persistence, repeat imports, real dashboard metrics, generic text pipeline, campaign save/reopen, merchant isolation, logout.");
} finally {
  setAbstractFetchFunc(fetch);
  await prisma.session.deleteMany({ where: { shop: { in: shops } } });
  await prisma.merchant.deleteMany({ where: { id: { in: created }, shopDomain: { in: shops } } });
  await prisma.$disconnect();
  console.log("Temporary smoke records removed.");
}
