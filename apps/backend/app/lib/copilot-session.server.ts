/**
 * Copilot session tokens for the standalone Vite frontend.
 * HMAC-SHA256 JWT signed with SESSION_SECRET. Server-side only.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const COPILOT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface CopilotSessionPayload {
  shop: string;
  merchantId: string;
  exp: number;
}

export class CopilotSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CopilotSessionError";
  }
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new CopilotSessionError("SESSION_SECRET is not set");
  }
  return secret;
}

function base64UrlEncode(value: string | Buffer): string {
  const buffer = typeof value === "string" ? Buffer.from(value) : value;
  return buffer.toString("base64url");
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function signInput(headerJson: string, payloadJson: string): string {
  return `${base64UrlEncode(headerJson)}.${base64UrlEncode(payloadJson)}`;
}

function hmacSignature(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

function signaturesMatch(expected: string, actual: string): boolean {
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(actual);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export function signCopilotSession(input: {
  shop: string;
  merchantId: string;
  ttlSeconds?: number;
  now?: number;
}): string {
  const shop = input.shop.trim();
  const merchantId = input.merchantId.trim();
  if (!shop || !merchantId) {
    throw new CopilotSessionError("shop and merchantId are required");
  }

  const now = input.now ?? Math.floor(Date.now() / 1000);
  const ttl = input.ttlSeconds ?? COPILOT_TOKEN_TTL_SECONDS;
  const header = JSON.stringify({ alg: "HS256", typ: "JWT" });
  const payload = JSON.stringify({
    shop,
    merchantId,
    exp: now + ttl,
  } satisfies CopilotSessionPayload);
  const data = signInput(header, payload);
  return `${data}.${hmacSignature(getSessionSecret(), data)}`;
}

export function verifyCopilotSession(
  token: string,
  options?: { now?: number },
): CopilotSessionPayload {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new CopilotSessionError("Malformed token");
  }

  const [headerPart, payloadPart, signature] = parts;
  const data = `${headerPart}.${payloadPart}`;
  const expected = hmacSignature(getSessionSecret(), data);
  if (!signaturesMatch(expected, signature)) {
    throw new CopilotSessionError("Invalid signature");
  }

  let header: { alg?: string; typ?: string };
  try {
    header = JSON.parse(base64UrlDecode(headerPart).toString("utf8")) as {
      alg?: string;
      typ?: string;
    };
  } catch {
    throw new CopilotSessionError("Invalid token header");
  }
  if (header.alg !== "HS256") {
    throw new CopilotSessionError("Unsupported token algorithm");
  }

  let payload: Partial<CopilotSessionPayload>;
  try {
    payload = JSON.parse(base64UrlDecode(payloadPart).toString("utf8")) as Partial<CopilotSessionPayload>;
  } catch {
    throw new CopilotSessionError("Invalid token payload");
  }

  if (typeof payload.shop !== "string" || !payload.shop.trim()) {
    throw new CopilotSessionError("Token missing shop");
  }
  if (typeof payload.merchantId !== "string" || !payload.merchantId.trim()) {
    throw new CopilotSessionError("Token missing merchantId");
  }
  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
    throw new CopilotSessionError("Token missing exp");
  }

  const now = options?.now ?? Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    throw new CopilotSessionError("Token expired");
  }

  return {
    shop: payload.shop,
    merchantId: payload.merchantId,
    exp: payload.exp,
  };
}

/** Bearer header first, then `?token=` for the OAuth redirect landing URL. */
export function getCopilotTokenFromRequest(request: Request): string | null {
  const authorization = request.headers.get("Authorization") ?? request.headers.get("authorization");
  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    const bearer = match?.[1]?.trim();
    if (bearer) return bearer;
  }

  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token")?.trim();
  return queryToken || null;
}

export function unauthorizedJson(message = "Unauthorized"): Response {
  return Response.json({ error: message }, { status: 401 });
}

export function readCopilotSession(
  request: Request,
): { ok: true; session: CopilotSessionPayload } | { ok: false; response: Response } {
  const token = getCopilotTokenFromRequest(request);
  if (!token) {
    return { ok: false, response: unauthorizedJson() };
  }
  try {
    return { ok: true, session: verifyCopilotSession(token) };
  } catch {
    return { ok: false, response: unauthorizedJson() };
  }
}
