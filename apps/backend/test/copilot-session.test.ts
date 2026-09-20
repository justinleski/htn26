import assert from "node:assert/strict";
import test from "node:test";
import {
  getCopilotTokenFromRequest,
  signCopilotSession,
  verifyCopilotSession,
} from "../app/lib/copilot-session.server.js";

const secret = "test-session-secret-for-copilot-hmac";

test("signCopilotSession and verifyCopilotSession round-trip shop and merchantId", () => {
  process.env.SESSION_SECRET = secret;
  const token = signCopilotSession({
    shop: "htn26-rain-jackets.myshopify.com",
    merchantId: "merchant_123",
    now: 1_000_000,
    ttlSeconds: 3600,
  });

  const payload = verifyCopilotSession(token, { now: 1_000_000 });
  assert.equal(payload.shop, "htn26-rain-jackets.myshopify.com");
  assert.equal(payload.merchantId, "merchant_123");
  assert.equal(payload.exp, 1_003_600);
});

test("verifyCopilotSession rejects a tampered payload", () => {
  process.env.SESSION_SECRET = secret;
  const token = signCopilotSession({
    shop: "htn26-rain-jackets.myshopify.com",
    merchantId: "merchant_123",
  });
  const [header, payload, signature] = token.split(".");
  const tamperedPayload = Buffer.from(
    JSON.stringify({ shop: "evil.myshopify.com", merchantId: "merchant_123", exp: 9_999_999_999 }),
  ).toString("base64url");
  const tampered = `${header}.${tamperedPayload}.${signature}`;

  assert.throws(() => verifyCopilotSession(tampered), /Invalid signature/);
});

test("verifyCopilotSession rejects an expired token", () => {
  process.env.SESSION_SECRET = secret;
  const token = signCopilotSession({
    shop: "htn26-rain-jackets.myshopify.com",
    merchantId: "merchant_123",
    now: 100,
    ttlSeconds: 10,
  });

  assert.throws(() => verifyCopilotSession(token, { now: 111 }), /expired/i);
});

test("getCopilotTokenFromRequest prefers Authorization Bearer over ?token=", () => {
  const request = new Request("http://localhost/api/session?token=query-token", {
    headers: { Authorization: "Bearer header-token" },
  });
  assert.equal(getCopilotTokenFromRequest(request), "header-token");
});

test("getCopilotTokenFromRequest reads ?token= when Bearer is missing", () => {
  const request = new Request("http://localhost/insights?token=query-token");
  assert.equal(getCopilotTokenFromRequest(request), "query-token");
});
