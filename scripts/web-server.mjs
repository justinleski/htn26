import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_UPSTREAM = "https://api-production-aa9b.up.railway.app";
const DEFAULT_PUBLIC_URL = "https://adgile.tech";
const PROXY_TIMEOUT_MS = 180_000;
const PAGES = new Set(["/", "/dashboard", "/insights", "/campaign", "/creative-testing"]);
const ASSET = /^\/assets\/[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(?:js|css|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf)$/;
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};
const HOP_HEADERS = new Set([
  "connection", "keep-alive", "proxy-connection", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade",
]);

function originUrl(value, name) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${name} must be a valid origin.`); }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be an HTTPS origin (HTTP is allowed only for local tests).`);
  }
  return url;
}

function endResponse(response, status, message, headers = {}, head = false) {
  if (response.destroyed) return;
  if (response.headersSent) {
    response.destroy();
    return;
  }
  const body = Buffer.from(message);
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "content-length": body.length,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...headers,
  });
  response.end(head ? undefined : body);
}

// Connection can nominate additional hop-by-hop fields on either side of a proxy.
function endToEndHeaders(source) {
  const connection = Array.isArray(source.connection) ? source.connection.join(",") : source.connection || "";
  const excluded = new Set([...HOP_HEADERS, ...connection.split(",").map((name) => name.trim().toLowerCase())]);
  return Object.fromEntries(Object.entries(source).filter(([name, value]) => value !== undefined && !excluded.has(name.toLowerCase())));
}

function proxyRequest(request, response, upstream, publicUrl, timeoutMs) {
  const headers = endToEndHeaders(request.headers);
  for (const name of Object.keys(headers)) {
    if (name === "forwarded" || name.startsWith("x-forwarded-")) delete headers[name];
  }
  headers.host = upstream.host;
  headers["x-forwarded-host"] = publicUrl.host;
  headers["x-forwarded-proto"] = publicUrl.protocol.slice(0, -1);
  headers["x-forwarded-port"] = publicUrl.port || (publicUrl.protocol === "https:" ? "443" : "80");
  headers["x-forwarded-for"] = request.socket.remoteAddress || "";

  const transport = upstream.protocol === "https:" ? https : http;
  let timedOut = false;
  let upstreamResponse;
  const outgoing = transport.request({
    protocol: upstream.protocol,
    hostname: upstream.hostname.replace(/^\[|\]$/g, ""),
    port: upstream.port || undefined,
    method: request.method,
    path: request.url,
    headers,
  }, (incoming) => {
    upstreamResponse = incoming;
    const responseHeaders = endToEndHeaders(incoming.headers);
    responseHeaders["cache-control"] ??= "no-store";
    response.writeHead(incoming.statusCode || 502, responseHeaders);
    incoming.on("error", () => endResponse(response, 502, "Upstream service unavailable."));
    incoming.on("end", () => clearTimeout(timer));
    incoming.pipe(response);
  });
  // A total deadline bounds long uploads and responses, including streaming ones.
  const timer = setTimeout(() => {
    timedOut = true;
    outgoing.destroy(new Error("Proxy deadline exceeded"));
    upstreamResponse?.destroy();
  }, timeoutMs);
  timer.unref();
  outgoing.on("error", () => {
    clearTimeout(timer);
    endResponse(response, timedOut ? 504 : 502,
      timedOut ? "Upstream request timed out." : "Upstream service unavailable.");
  });
  request.on("aborted", () => {
    clearTimeout(timer);
    outgoing.destroy();
    upstreamResponse?.destroy();
  });
  request.on("error", () => {
    clearTimeout(timer);
    outgoing.destroy();
    upstreamResponse?.destroy();
  });
  response.on("close", () => {
    clearTimeout(timer);
    if (!response.writableEnded) {
      outgoing.destroy();
      upstreamResponse?.destroy();
    }
  });
  request.pipe(outgoing);
}

async function serveStatic(request, response, pathname, distDir) {
  const isPage = PAGES.has(pathname);
  if (!isPage && !ASSET.test(pathname)) {
    endResponse(response, 404, "Not found.", {}, request.method === "HEAD");
    return;
  }
  const file = resolve(distDir, isPage ? "index.html" : pathname.slice(1));
  try {
    const [root, resolvedFile] = await Promise.all([realpath(distDir), realpath(file)]);
    const fromRoot = relative(root, resolvedFile);
    if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
      endResponse(response, 404, "Not found.", {}, request.method === "HEAD");
      return;
    }
    const metadata = await stat(resolvedFile);
    if (!metadata.isFile()) {
      endResponse(response, 404, "Not found.", {}, request.method === "HEAD");
      return;
    }
    response.writeHead(200, {
      "content-type": CONTENT_TYPES[extname(resolvedFile)] || "application/octet-stream",
      "content-length": metadata.size,
      "cache-control": isPage ? "no-cache" : "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    const stream = createReadStream(resolvedFile);
    stream.on("error", () => response.destroy());
    response.on("close", () => stream.destroy());
    stream.pipe(response);
  } catch {
    endResponse(response, isPage ? 503 : 404, isPage ? "Frontend unavailable." : "Not found.", {}, request.method === "HEAD");
  }
}

export function createWebServer({
  apiUpstream = process.env.API_UPSTREAM || DEFAULT_UPSTREAM,
  publicAppUrl = process.env.PUBLIC_APP_URL || DEFAULT_PUBLIC_URL,
  distDir = resolve(process.cwd(), "dist"),
  proxyTimeoutMs = PROXY_TIMEOUT_MS,
} = {}) {
  const upstream = originUrl(apiUpstream, "API_UPSTREAM");
  const publicUrl = originUrl(publicAppUrl, "PUBLIC_APP_URL");
  if (!Number.isSafeInteger(proxyTimeoutMs) || proxyTimeoutMs < 1) throw new Error("Invalid proxy timeout.");

  const server = http.createServer((request, response) => {
    // Keep the original target intact for OAuth HMAC validation and webhook bodies.
    const target = request.url || "/";
    if (!target.startsWith("/") || target.startsWith("//") || /[\\\u0000-\u001f\u007f#]/.test(target)) {
      request.resume();
      endResponse(response, 400, "Invalid request target.");
      return;
    }
    const rawPathname = target.split("?", 1)[0];
    if (rawPathname === "/health") {
      request.resume();
      if (request.method !== "GET" && request.method !== "HEAD") {
        endResponse(response, 405, "Method not allowed.", { allow: "GET, HEAD" });
        return;
      }
      endResponse(response, 200, '{"status":"ok"}', { "content-type": "application/json" }, request.method === "HEAD");
      return;
    }
    const host = request.headers.host;
    if (!host) {
      request.resume();
      endResponse(response, 400, "Host header required.");
      return;
    }
    if (host.toLowerCase() !== publicUrl.host.toLowerCase()) {
      request.resume();
      endResponse(response, 308, "Use the canonical application address.", { location: `${publicUrl.origin}${target}` }, request.method === "HEAD");
      return;
    }
    if (["/api", "/auth", "/webhooks"].some((prefix) => rawPathname === prefix || rawPathname.startsWith(`${prefix}/`))) {
      proxyRequest(request, response, upstream, publicUrl, proxyTimeoutMs);
      return;
    }
    request.resume();
    if (request.method !== "GET" && request.method !== "HEAD") {
      endResponse(response, 405, "Method not allowed.", { allow: "GET, HEAD" });
      return;
    }
    let pathname;
    try { pathname = decodeURIComponent(rawPathname); } catch {
      endResponse(response, 400, "Invalid request path.", {}, request.method === "HEAD");
      return;
    }
    if (pathname.includes("\\") || pathname.includes("\0") || pathname.split("/").some((part) => part === "." || part === "..")) {
      endResponse(response, 404, "Not found.", {}, request.method === "HEAD");
      return;
    }
    void serveStatic(request, response, pathname, distDir);
  });
  server.requestTimeout = PROXY_TIMEOUT_MS;
  server.headersTimeout = 60_000;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port.");
  const server = createWebServer();
  server.listen(port, "0.0.0.0", () => console.log(`Web server listening on port ${port}`));
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, () => {
      server.close(() => process.exit(0));
      setTimeout(() => { server.closeAllConnections(); process.exit(0); }, 20_000).unref();
    });
  }
}
