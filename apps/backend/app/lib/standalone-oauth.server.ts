import { normalizeShop } from "../../src/auth/standalone.js";

function loginLocation(shop: string | null): string {
  const appUrl = process.env.SHOPIFY_APP_URL;
  if (!appUrl) throw new Error("SHOPIFY_APP_URL is not set");
  const origin = new URL(appUrl).origin;
  if (!origin.startsWith("https://") && !/^http:\/\/localhost(?::\d+)?$/.test(origin)) {
    throw new Error("Shopify OAuth requires HTTPS.");
  }
  const destination = new URL(shop ? "/api/auth/start" : "/", origin);
  if (shop) destination.searchParams.set("shop", normalizeShop(shop));
  return destination.toString();
}

// Old bookmarks must start on the canonical origin so its host-only cookies work.
export async function beginStandaloneOAuth(_request: Request, shop: string): Promise<never> {
  throw new Response(null, { status: 303, headers: {
    Location: loginLocation(shop), "Cache-Control": "no-store",
  } });
}

// Old callbacks use a different cookie path. Restart rather than reuse an offline
// session or issue the retired token-in-URL credential.
export async function completeStandaloneOAuth(request: Request): Promise<Response> {
  const shop = new URL(request.url).searchParams.get("shop");
  return new Response(null, { status: 303, headers: {
    Location: loginLocation(shop), "Cache-Control": "no-store",
  } });
}
