import "@shopify/shopify-api/adapters/web-api";
import { shopifyApi, ApiVersion, LogSeverity, type Session, type Shopify } from "@shopify/shopify-api";
import { ensureUninstallWebhook } from "./webhooks.js";

export interface SessionStore {
  loadSession(id: string): Promise<Session | undefined>;
  storeSession(session: Session): Promise<boolean>;
  deleteSession(id: string): Promise<boolean>;
}
export interface StandaloneAuth {
  api: Shopify;
  origin: string;
  currentSession(request: Request): Promise<Session | undefined>;
  requireSession(request: Request): Promise<Session>;
  start(request: Request): Promise<Response>;
  callback(request: Request): Promise<Response>;
  logout(request: Request): Promise<Response>;
}
export function normalizeShop(value: string): string {
  const shop = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
    throw Response.json({ error: "Enter your store's .myshopify.com domain." }, { status: 400 });
  }
  return shop;
}
export function requireSameOrigin(request: Request, allowedOrigin: string): void {
  if (request.headers.get("Origin") !== allowedOrigin) {
    throw Response.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
}
function httpOnlyHeaders(input: Headers) {
  const headers = new Headers(input);
  const cookies = input.getSetCookie();
  headers.delete("Set-Cookie");
  for (const cookie of cookies) headers.append("Set-Cookie", `${cookie}; HttpOnly`);
  return headers;
}
export function createStandaloneAuth(options: {
  apiKey: string; apiSecretKey: string; appUrl: string; scopes: string[]; storage: SessionStore;
}): StandaloneAuth {
  const origin = new URL(options.appUrl).origin;
  if (!origin.startsWith("https://") && !/^http:\/\/localhost(?::\d+)?$/.test(origin)) {
    throw new Error("Shopify OAuth requires HTTPS (localhost is allowed for development).");
  }
  const api: Shopify = shopifyApi({
    apiKey: options.apiKey, apiSecretKey: options.apiSecretKey, scopes: options.scopes,
    hostName: new URL(origin).host, hostScheme: new URL(origin).protocol === "https:" ? "https" : "http",
    apiVersion: ApiVersion.July26, isEmbeddedApp: false, logger: { level: LogSeverity.Error },
  });
  const callbackPath = "/api/auth/callback";
  async function currentSession(request: Request) {
    const id = await api.session.getCurrentId({ isOnline: true, rawRequest: request });
    const session = id ? await options.storage.loadSession(id) : undefined;
    if (!session?.isOnline || !session.expires || !session.isActive(api.config.scopes)) return undefined;
    normalizeShop(session.shop);
    return session;
  }
  return {
    api, origin, currentSession,
    async requireSession(request: Request) {
      const session = await currentSession(request);
      if (!session) throw Response.json({ error: "Connect your Shopify store to continue." }, { status: 401 });
      return session;
    },
    async start(request: Request) {
      const shop = normalizeShop(new URL(request.url).searchParams.get("shop") ?? "");
      const response = await api.auth.begin({ shop, callbackPath, isOnline: true, rawRequest: request }) as Response;
      return new Response(response.body, { status: response.status, headers: httpOnlyHeaders(response.headers) });
    },
    async callback(request: Request) {
      normalizeShop(new URL(request.url).searchParams.get("shop") ?? "");
      const { session, headers } = await api.auth.callback<Headers>({ rawRequest: request });
      if (!session.isOnline || !session.expires || !session.isActive(api.config.scopes)) {
        throw Response.json({ error: "Shopify did not grant the required access. Please reconnect." }, { status: 401 });
      }
      try {
        await ensureUninstallWebhook(api, session, origin);
      } catch {
        throw Response.json({ error: "Could not finish Shopify connection. Please try again." }, { status: 503 });
      }
      if (!await options.storage.storeSession(session)) throw new Error("Could not store Shopify session");
      headers.set("Location", `${origin}/dashboard`);
      headers.set("Cache-Control", "no-store");
      for (const name of ["shopify_app_state", "shopify_app_state.sig"]) {
        headers.append("Set-Cookie", `${name}=; Path=${callbackPath}; Max-Age=0; Secure; SameSite=Lax`);
      }
      return new Response(null, { status: 302, headers: httpOnlyHeaders(headers) });
    },
    async logout(request: Request) {
      const session = await currentSession(request);
      if (session) await options.storage.deleteSession(session.id);
      const headers = new Headers({ "Cache-Control": "no-store" });
      for (const name of ["shopify_app_session", "shopify_app_session.sig"]) {
        headers.append("Set-Cookie", `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`);
      }
      return Response.json({ ok: true }, { headers });
    },
  };
}
