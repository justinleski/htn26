/**
 * Public health probe for Railway / local — no Shopify session required.
 */
import type { LoaderFunctionArgs } from "react-router";
import { checkDatabaseHealth } from "../db.server";
import { checkElasticHealth } from "../lib/elastic.server";
import { checkSentryHealth } from "../lib/sentry.server";
import {
  getEnv,
  hasGoogleOAuthClient,
  hasShopifyCredentials,
} from "../lib/env.server";

export const loader = async (_args: LoaderFunctionArgs) => {
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

  return Response.json(body, { status: database.ok ? 200 : 503 });
};
