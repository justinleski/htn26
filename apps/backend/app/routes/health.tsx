/**
 * Public health probe for Railway / local — no Shopify session required.
 */
import type { LoaderFunctionArgs } from "react-router";
import { checkDatabaseHealth } from "../db.server";
import { applyCorsHeaders, corsPreflight } from "../lib/cors.server";
import { checkElasticHealth } from "../lib/elastic.server";
import { checkSentryHealth } from "../lib/sentry.server";
import {
  getEnv,
  hasGoogleOAuthClient,
  hasShopifyCredentials,
} from "../lib/env.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return corsPreflight(request);
  }

  const env = getEnv();
  const [database, elastic] = await Promise.all([
    checkDatabaseHealth(),
    checkElasticHealth(),
  ]);
  const sentry = checkSentryHealth();

  const body = {
    ok: database.ok,
    service: "htn26-backend",
    shopifyConfigured: hasShopifyCredentials(env),
    databaseConfigured: Boolean(env.databaseUrl),
    database,
    googleOAuthConfigured: hasGoogleOAuthClient(env),
    elastic,
    sentry,
  };

  return applyCorsHeaders(
    request,
    Response.json(body, { status: database.ok ? 200 : 503 }),
  );
};
