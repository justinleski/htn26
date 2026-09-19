import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { checkDatabaseHealth } from "../db.server";
import { checkElasticHealth } from "../lib/elastic.server";
import { checkSentryHealth } from "../lib/sentry.server";
import {
  getEnv,
  hasGoogleOAuthClient,
  hasOpenAi,
  hasShopifyCredentials,
} from "../lib/env.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const [database, elastic] = await Promise.all([
    checkDatabaseHealth(),
    checkElasticHealth(),
  ]);
  const sentry = checkSentryHealth();
  const env = getEnv();
  return {
    database,
    elastic,
    sentry,
    shopifyConfigured: hasShopifyCredentials(env),
    googleOAuthConfigured: hasGoogleOAuthClient(env),
    openaiConfigured: hasOpenAi(env),
    databaseConfigured: Boolean(env.databaseUrl),
  };
};

export default function HealthPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <s-page heading="Health">
      <s-section heading="Platform">
        <s-unordered-list>
          <s-list-item>
            Shopify credentials:{" "}
            {data.shopifyConfigured ? "present" : "missing"}
          </s-list-item>
          <s-list-item>
            Database:{" "}
            {data.database.ok
              ? `ok (Session table, ${data.database.sessionCount ?? 0} rows)`
              : data.databaseConfigured
                ? `configured but unreachable (${data.database.error})`
                : "DATABASE_URL missing"}
          </s-list-item>
          <s-list-item>
            Elasticsearch:{" "}
            {data.elastic.configured
              ? data.elastic.ok
                ? `ok (${data.elastic.status})`
                : `configured but failed (${data.elastic.error})`
              : "not configured"}
          </s-list-item>
          <s-list-item>
            Sentry:{" "}
            {data.sentry.configured
              ? data.sentry.initialized
                ? "initialized"
                : "configured, not initialized"
              : "not configured"}
          </s-list-item>
          <s-list-item>
            OpenAI: {data.openaiConfigured ? "key present (workflow not wired)" : "not configured"}
          </s-list-item>
          <s-list-item>
            Google OAuth client:{" "}
            {data.googleOAuthConfigured ? "present" : "not set"}
          </s-list-item>
        </s-unordered-list>
      </s-section>
      <s-paragraph>
        Public JSON probe (no Shopify session):{" "}
        <s-link href="/health" target="_blank">
          /health
        </s-link>
      </s-paragraph>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
