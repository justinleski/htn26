import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { gaConnectStatus } from "../lib/ga/client.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { ga: gaConnectStatus() };
};

export default function SettingsPage() {
  const { ga } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Settings">
      <s-section heading="Google Analytics">
        <s-paragraph>
          Merchants connect Google Analytics with OAuth (Connect with Google).
          You never paste a GA API key into this app. Tokens and the GA4
          property ID are stored per shop on MerchantIntegration.
        </s-paragraph>
        <s-paragraph>
          {ga.message}
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-button disabled={!ga.connectEnabled}>
            Connect Google Analytics
          </s-button>
        </s-stack>
        <s-paragraph>
          Status: app OAuth client{" "}
          {ga.appOAuthConfigured ? "configured" : "not configured"}; connect
          flow {ga.connectEnabled ? "enabled" : "deferred (no live pull yet)"}.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
