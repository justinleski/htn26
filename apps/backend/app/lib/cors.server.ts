/**
 * CORS for the standalone Vite frontend calling `/api/*`.
 * Bearer tokens are primary; credentials are optional.
 */

const DEFAULT_FRONTEND_URL = "http://localhost:5173";

export function getFrontendUrl(): string {
  const raw = process.env.FRONTEND_URL?.trim() || DEFAULT_FRONTEND_URL;
  try {
    return new URL(raw).toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_FRONTEND_URL;
  }
}

export function getAllowedFrontendOrigins(): string[] {
  const origins = new Set<string>();
  try {
    origins.add(new URL(getFrontendUrl()).origin);
  } catch {
    origins.add(new URL(DEFAULT_FRONTEND_URL).origin);
  }

  const extra = process.env.FRONTEND_ORIGIN?.trim();
  if (extra) {
    try {
      origins.add(new URL(extra).origin);
    } catch {
      origins.add(extra.replace(/\/$/, ""));
    }
  }

  return [...origins];
}

export function writeCorsHeaders(request: Request, headers: Headers): void {
  const origin = request.headers.get("Origin");
  const allowed = getAllowedFrontendOrigins();

  if (origin && allowed.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    headers.set("Access-Control-Max-Age", "86400");
  }
}

export function applyCorsHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  writeCorsHeaders(request, headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function corsPreflight(request: Request): Response {
  const headers = new Headers();
  writeCorsHeaders(request, headers);
  return new Response(null, { status: 204, headers });
}
