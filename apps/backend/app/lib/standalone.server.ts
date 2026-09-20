import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "../db.server";
import { createStandaloneAuth } from "../../src/auth/standalone.js";
let auth: ReturnType<typeof createStandaloneAuth> | undefined;
export function standaloneAuth() {
  if (!auth) {
    const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_APP_URL } = process.env;
    if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET || !SHOPIFY_APP_URL) {
      throw Response.json({ error: "Shopify sign-in is not configured on the server." }, { status: 503 });
    }
    auth = createStandaloneAuth({
      apiKey: SHOPIFY_API_KEY, apiSecretKey: SHOPIFY_API_SECRET, appUrl: SHOPIFY_APP_URL,
      scopes: (process.env.SCOPES ?? "read_products").split(",").map((scope) => scope.trim()).filter(Boolean),
      storage: new PrismaSessionStorage(prisma),
    });
  }
  return auth;
}
