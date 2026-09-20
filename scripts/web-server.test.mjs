import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import { createWebServer } from "./web-server.mjs";

const PUBLIC_URL = "https://adgile.tech";

async function listen(server) {
  await new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", done);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
  const closed = new Promise((done) => server.close(done));
  server.closeAllConnections();
  await closed;
}

async function fixture(t, upstreamHandler = (_request, response) => response.end("upstream"), options = {}) {
  const tempBase = resolve(tmpdir());
  const distDir = await mkdtemp(join(tempBase, "htn26-web-test-"));
  await mkdir(join(distDir, "assets"));
  await mkdir(join(distDir, "mock", "creative"), { recursive: true });
  await writeFile(join(distDir, "index.html"), "<!doctype html><h1>Adgile</h1>");
  await writeFile(join(distDir, "assets", "entry-AbC123.js"), 'console.log("frontend");');
  await writeFile(join(distDir, "mock", "creative", "winner-of-three-placeholder.png"), Buffer.from([137, 80, 78, 71]));
  await writeFile(join(distDir, ".env"), "SHOULD_NEVER_BE_SERVED=true");
  const upstream = http.createServer(upstreamHandler);
  const upstreamUrl = await listen(upstream);
  const web = createWebServer({ apiUpstream: upstreamUrl, publicAppUrl: PUBLIC_URL, distDir, ...options });
  const webUrl = await listen(web);
  t.after(async () => {
    await Promise.all([close(web), close(upstream)]);
    // Delete only the directory allocated by this test, under the OS temp root.
    assert.equal(dirname(resolve(distDir)), tempBase);
    assert.ok(basename(distDir).startsWith("htn26-web-test-"));
    await rm(distDir, { recursive: true, force: true });
  });
  return { webUrl, upstreamUrl, upstream, distDir };
}

function request(url, path, { method = "GET", headers = {}, body, onChunk } = {}) {
  return new Promise((done, reject) => {
    const outgoing = http.request(url, { method, path, headers: { host: "adgile.tech", ...headers } }, (incoming) => {
      const chunks = [];
      incoming.on("data", (chunk) => { chunks.push(chunk); onChunk?.(chunk); });
      incoming.on("error", reject);
      incoming.on("end", () => done({
        status: incoming.statusCode,
        headers: incoming.headers,
        body: Buffer.concat(chunks),
      }));
    });
    outgoing.on("error", reject);
    outgoing.end(body);
  });
}

test("OAuth proxy preserves exact callback query, cookies and redirect without following it", async (t) => {
  const callback = "/api/auth/callback?shop=test.myshopify.com&state=a%2Bb%20c&hmac=ABC123&extra=one&extra=two";
  const cookies = [
    "shopify_app_session=session-test; Path=/; HttpOnly; Secure; SameSite=Lax",
    "shopify_app_session.sig=signature-test; Path=/; HttpOnly; Secure; SameSite=Lax",
    "shopify_app_state=; Path=/api/auth/callback; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure",
  ];
  let calls = 0;
  let seen;
  const { webUrl, upstreamUrl } = await fixture(t, (incoming, response) => {
    calls += 1;
    seen = { target: incoming.url, headers: incoming.headers };
    response.writeHead(302, {
      location: "https://adgile.tech/dashboard",
      "set-cookie": cookies,
      connection: "keep-alive, x-upstream-hop",
      "x-upstream-hop": "remove-me",
    });
    response.end("redirect");
  });
  const result = await request(webUrl, callback, { headers: {
    cookie: "shopify_app_state=state-test; shopify_app_state.sig=signature-test",
    origin: "https://adgile.tech",
    connection: "keep-alive, x-client-hop",
    "x-client-hop": "remove-me",
    forwarded: 'host="evil.example";proto=http',
    "x-forwarded-host": "evil.example",
    "x-forwarded-proto": "http",
    "x-forwarded-for": "forged-client-ip",
    "x-forwarded-port": "1234",
  } });
  assert.equal(calls, 1);
  assert.equal(seen.target, callback);
  assert.equal(seen.headers.host, new URL(upstreamUrl).host);
  assert.equal(seen.headers.cookie, "shopify_app_state=state-test; shopify_app_state.sig=signature-test");
  assert.equal(seen.headers.origin, PUBLIC_URL);
  assert.equal(seen.headers["x-forwarded-host"], "adgile.tech");
  assert.equal(seen.headers["x-forwarded-proto"], "https");
  assert.equal(seen.headers["x-forwarded-port"], "443");
  assert.equal(seen.headers["x-forwarded-for"], "127.0.0.1");
  assert.equal(seen.headers.forwarded, undefined);
  assert.equal(seen.headers["x-client-hop"], undefined);
  assert.equal(result.headers["x-upstream-hop"], undefined);
  assert.equal(result.status, 302);
  assert.equal(result.headers.location, "https://adgile.tech/dashboard");
  assert.deepEqual(result.headers["set-cookie"], cookies);
  assert.equal(result.body.toString(), "redirect");
});

test("webhook proxy streams the original bytes and preserves HMAC and Origin", async (t) => {
  const body = Buffer.concat([Buffer.from('{ "shop": "test.myshopify.com", "bytes": "'), Buffer.from([0, 255, 1, 128]), Buffer.from('" }\n')]);
  const signature = createHmac("sha256", "test-only-key").update(body).digest("base64");
  let seen;
  const { webUrl } = await fixture(t, (incoming, response) => {
    const chunks = [];
    incoming.on("data", (chunk) => chunks.push(chunk));
    incoming.on("end", () => {
      seen = { body: Buffer.concat(chunks), headers: incoming.headers, method: incoming.method, path: incoming.url };
      response.writeHead(202, { "content-type": "application/octet-stream" });
      response.end(seen.body);
    });
  });
  const result = await request(webUrl, "/webhooks/app/uninstalled?opaque=a%2fb%2Bc", { method: "POST", body, headers: {
    "content-type": "application/json",
    "content-length": String(body.length),
    "x-shopify-hmac-sha256": signature,
    origin: "https://untrusted-origin.example",
  } });
  assert.equal(result.status, 202);
  assert.deepEqual(seen.body, body);
  assert.deepEqual(result.body, body);
  assert.equal(seen.method, "POST");
  assert.equal(seen.path, "/webhooks/app/uninstalled?opaque=a%2fb%2Bc");
  assert.equal(seen.headers["content-length"], String(body.length));
  assert.equal(seen.headers["content-type"], "application/json");
  assert.equal(seen.headers.origin, "https://untrusted-origin.example");
  assert.equal(createHmac("sha256", "test-only-key").update(seen.body).digest("base64"), signature);
  assert.equal(seen.headers["x-shopify-hmac-sha256"], signature);
});

test("alternate hosts redirect to the fixed canonical host before auth or mutations", async (t) => {
  let calls = 0;
  const { webUrl } = await fixture(t, (_incoming, response) => { calls += 1; response.end(); });
  const target = "/api/auth/start?shop=test.myshopify.com&next=%2Fdashboard";
  const result = await request(webUrl, target, { method: "POST", headers: { host: "web-production.up.railway.app", "x-forwarded-host": "adgile.tech" }, body: "do-not-forward" });
  assert.equal(result.status, 308);
  assert.equal(result.headers.location, `${PUBLIC_URL}${target}`);
  assert.equal(calls, 0);
});

test("health responds independently of canonical host and upstream", async (t) => {
  let calls = 0;
  const { webUrl } = await fixture(t, (_incoming, response) => { calls += 1; response.end(); });
  const result = await request(webUrl, "/health", { headers: { host: "railway.internal" } });
  assert.equal(result.status, 200);
  assert.deepEqual(JSON.parse(result.body), { status: "ok" });
  const head = await request(webUrl, "/health", { method: "HEAD", headers: { host: "railway.internal" } });
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(calls, 0);
});

test("all configured API route families reach only the fixed upstream", async (t) => {
  const paths = [];
  const { webUrl } = await fixture(t, (incoming, response) => { paths.push(incoming.url); response.end("same upstream"); });
  for (const path of ["/api/session", "/auth/copilot?upstream=https%3A%2F%2Fevil.example", "/webhooks/app/scopes_update"]) {
    const result = await request(webUrl, path);
    assert.equal(result.status, 200);
    assert.equal(result.body.toString(), "same upstream");
  }
  assert.deepEqual(paths, ["/api/session", "/auth/copilot?upstream=https%3A%2F%2Fevil.example", "/webhooks/app/scopes_update"]);
});

test("proxy sends response chunks as they arrive instead of buffering", async (t) => {
  let completedUpstream = false;
  const { webUrl } = await fixture(t, (_incoming, response) => {
    response.write("first chunk");
    setTimeout(() => { completedUpstream = true; response.end("last chunk"); }, 80);
  });
  let firstWasStreaming = false;
  const result = await request(webUrl, "/api/stream", { onChunk() { if (!completedUpstream) firstWasStreaming = true; } });
  assert.equal(result.status, 200);
  assert.equal(result.body.toString(), "first chunklast chunk");
  assert.ok(firstWasStreaming, "first chunk must be delivered before upstream finishes");
});

test("upstream failure returns a generic 502 without exposing connection details", async (t) => {
  const { webUrl, upstream } = await fixture(t);
  await close(upstream);
  const result = await request(webUrl, "/api/session");
  assert.equal(result.status, 502);
  assert.equal(result.body.toString(), "Upstream service unavailable.");
  assert.equal(result.headers["cache-control"], "no-store");
});

test("a stalled upstream reaches the total proxy deadline", async (t) => {
  const { webUrl } = await fixture(t, () => {}, { proxyTimeoutMs: 75 });
  const result = await request(webUrl, "/api/generate");
  assert.equal(result.status, 504);
  assert.equal(result.body.toString(), "Upstream request timed out.");
});

test("the total deadline also closes an upstream that stalls after sending headers", async (t) => {
  const { webUrl } = await fixture(t, (_incoming, response) => response.write("partial"), { proxyTimeoutMs: 75 });
  await assert.rejects(request(webUrl, "/api/stream"), /aborted|reset|premature/i);
});

test("SPA routes and assets are served with correct cache, MIME and HEAD behavior", async (t) => {
  const { webUrl } = await fixture(t);
  for (const path of ["/", "/dashboard", "/insights", "/campaign?id=saved", "/creative-testing"]) {
    const result = await request(webUrl, path);
    assert.equal(result.status, 200, path);
    assert.match(result.body.toString(), /Adgile/);
    assert.equal(result.headers["cache-control"], "no-cache");
    assert.equal(result.headers["content-type"], "text/html; charset=utf-8");
  }
  const asset = await request(webUrl, "/assets/entry-AbC123.js?v=1");
  assert.equal(asset.status, 200);
  assert.equal(asset.headers["content-type"], "text/javascript; charset=utf-8");
  assert.match(asset.headers["cache-control"], /immutable/);
  assert.equal(asset.headers["x-content-type-options"], "nosniff");
  const head = await request(webUrl, "/assets/entry-AbC123.js", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(head.headers["content-length"], asset.headers["content-length"]);
  const publicImage = await request(webUrl, "/mock/creative/winner-of-three-placeholder.png");
  assert.equal(publicImage.status, 200);
  assert.equal(publicImage.headers["content-type"], "image/png");
  assert.deepEqual(publicImage.body, Buffer.from([137, 80, 78, 71]));
});

test("unknown paths, secret files and encoded traversal never fall back to the SPA", async (t) => {
  const { webUrl } = await fixture(t);
  for (const path of ["/.env", "/missing-route", "/assets/../.env", "/assets/%2e%2e/.env", "/assets/..%2f.env", "/assets/%5c..%5c.env", "/assets/%00.js", "/assets/missing.js", "/assets/entry-AbC123.js/extra"]) {
    const result = await request(webUrl, path);
    assert.equal(result.status, 404, path);
    assert.doesNotMatch(result.body.toString(), /SHOULD_NEVER|Adgile/);
  }
  assert.equal((await request(webUrl, "/assets/%ZZ.js")).status, 400);
  assert.equal((await request(webUrl, "//evil.example/api/session")).status, 400);
  assert.equal((await request(webUrl, "http://evil.example/api/session")).status, 400);
});

test("configuration rejects credentials, paths and non-HTTPS remote upstreams", () => {
  for (const apiUpstream of ["not-an-origin", "https://user:secret@example.com", "https://example.com/path", "https://example.com/?url=evil", "http://remote.example", "file:///etc/passwd"]) {
    assert.throws(() => createWebServer({ apiUpstream }), /API_UPSTREAM/);
  }
  assert.throws(() => createWebServer({ publicAppUrl: "https://adgile.tech/redirect" }), /PUBLIC_APP_URL/);
});
