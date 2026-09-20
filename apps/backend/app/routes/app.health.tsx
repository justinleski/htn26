import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { checkDatabaseHealth } from "../db.server";
import { checkElasticHealth } from "../lib/elastic.server";
import { captureAppError, checkSentryHealth } from "../lib/sentry.server";
import {
  getEnv,
  hasGoogleOAuthClient,
  hasBackboard,
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
    backboardConfigured: hasBackboard(env),
    databaseConfigured: Boolean(env.databaseUrl),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  const eventId = captureAppError(
    new Error("Manual Marketing Copilot Sentry test"),
    "health.sentry_test",
  );
  return eventId
    ? { ok: true, message: `Sentry test event sent (${eventId}).` }
    : { ok: false, message: "Sentry is not configured. Set SENTRY_DSN first." };
};

export default function HealthPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  return (
    <s-page heading="Health">
      <s-section heading="Platform">
        {actionData ? (
          <s-banner
            heading={actionData.ok ? "Sentry test complete" : "Sentry test unavailable"}
            tone={actionData.ok ? "success" : "warning"}
          >
            {actionData.message}
          </s-banner>
        ) : null}
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
            Backboard: {data.backboardConfigured ? "key present (workflow not wired)" : "not configured"}
          </s-list-item>
          <s-list-item>
            Google OAuth client:{" "}
            {data.googleOAuthConfigured ? "present" : "not set"}
          </s-list-item>
        </s-unordered-list>
        <Form method="post">
          <s-button
            type="submit"
            variant="secondary"
            disabled={navigation.state === "submitting"}
          >
            Send Sentry test error
          </s-button>
        </Form>
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
