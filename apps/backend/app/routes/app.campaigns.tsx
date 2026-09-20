import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { loadMerchantDashboard } from "../lib/merchant-data.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const dashboard = await loadMerchantDashboard(session.shop);
  return {
    campaignCount: dashboard.campaignCount,
    hasEvidence: dashboard.ads.length > 0,
    canGenerate: dashboard.canGenerate,
  };
};

export default function CampaignsPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <s-page heading="Campaigns">
      <s-section heading="Generated campaigns">
        {data.campaignCount === 0 ? (
          <s-paragraph>
            No saved campaigns yet. You can reopen a campaign here after the
            generate → claim-check → save flow exists.
          </s-paragraph>
        ) : (
          <s-paragraph>{data.campaignCount} saved campaign(s).</s-paragraph>
        )}
      </s-section>
      <s-section heading="Generate">
        <s-paragraph>
          {data.hasEvidence
            ? "Evidence is in Postgres, but the OpenAI analyze / generate / claim-check stages are not wired yet."
            : "Import labelled ads and reviews on the dashboard before generating."}
        </s-paragraph>
        <s-button disabled variant="primary">
          Generate campaign
        </s-button>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
