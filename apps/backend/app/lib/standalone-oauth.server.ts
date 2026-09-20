/**
 * Classic (non-embedded) Shopify OAuth for the standalone Vite product.
 *
 * The React Router Shopify library defaults to embedded session-token auth.
 * Calling authenticate.admin() outside Admin with embedded=false causes an
 * infinite Admin ↔ app redirect loop. This module uses authorization-code
 * OAuth with isEmbeddedApp: false instead.
 */
import "@shopify/shopify-api/adapters/web-api";
import {
  ApiVersion,
  CookieNotFound,
  shopifyApi,
  type Session,
} from "@shopify/shopify-api";
import { redirect } from "react-router";

import { redirectToFrontendInsights } from "./copilot-oauth.server";
import { sessionStorage } from "./session-storage.server";

function requireAppUrl(): URL {
  const raw = process.env.SHOPIFY_APP_URL?.trim();
  if (!raw) {
    throw new Error("SHOPIFY_APP_URL is not set");
  }
  return new URL(raw);
}

function getStandaloneShopifyApi() {
  const appUrl = requireAppUrl();
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecretKey = process.env.SHOPIFY_API_SECRET;
  if (!apiKey || !apiSecretKey) {
    throw new Error("SHOPIFY_API_KEY / SHOPIFY_API_SECRET are not set");
  }

  return shopifyApi({
    apiKey,
    apiSecretKey,
    apiVersion: ApiVersion.July26,
    scopes: (process.env.SCOPES || "read_products,write_products").split(","),
    hostName: appUrl.host,
    hostScheme: appUrl.protocol.replace(":", "") as "http" | "https",
    isEmbeddedApp: false,
  });
}

function normalizeShop(shop: string): string | null {
  const api = getStandaloneShopifyApi();
  const cleaned = shop
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const withDomain = cleaned.includes(".")
    ? cleaned
    : `${cleaned}.myshopify.com`;
  return api.utils.sanitizeShop(withDomain);
}

export async function loadOfflineSession(shop: string): Promise<Session | undefined> {
  const api = getStandaloneShopifyApi();
  const sanitized = normalizeShop(shop);
  if (!sanitized) return undefined;
  const id = api.session.getOfflineId(sanitized);
  return sessionStorage.loadSession(id);
}

/** Start authorization-code OAuth (offline token). Throws a redirect Response. */
export async function beginStandaloneOAuth(
  request: Request,
  shop: string,
): Promise<never> {
  const sanitized = normalizeShop(shop);
  if (!sanitized) {
    throw redirect("/auth/login");
  }

  const existing = await loadOfflineSession(sanitized);
  if (existing?.accessToken) {
    throw await redirectToFrontendInsights(existing.shop);
  }

  const api = getStandaloneShopifyApi();
  throw await api.auth.begin({
    shop: sanitized,
    callbackPath: "/auth/callback",
    isOnline: false,
    rawRequest: request,
  });
}

/** Complete OAuth callback, persist offline session, redirect to Vite app. */
export async function completeStandaloneOAuth(request: Request): Promise<Response> {
  const api = getStandaloneShopifyApi();

  try {
    const result = await api.auth.callback({
      rawRequest: request,
      expiring: false,
    });

    await sessionStorage.storeSession(result.session);

    const headers = new Headers();
    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item != null && item !== "") headers.append(key, String(item));
          }
        } else if (value != null && value !== "") {
          headers.append(key, String(value));
        }
      }
    }

    const insights = await redirectToFrontendInsights(result.session.shop);
    for (const [key, value] of insights.headers) {
      if (key.toLowerCase() === "location") {
        headers.set(key, value);
      } else {
        headers.append(key, value);
      }
    }

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (error) {
    if (error instanceof CookieNotFound) {
      const url = new URL(request.url);
      const shop = url.searchParams.get("shop");
      if (shop) {
        return beginStandaloneOAuth(request, shop);
      }
    }
    throw error;
  }
}
