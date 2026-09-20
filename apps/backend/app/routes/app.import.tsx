import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  actionError,
  importMerchantDemo,
  loadMerchantDashboard,
  type MerchantActionResult,
} from "../lib/merchant-data.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const dashboard = await loadMerchantDashboard(session.shop);
  return {
    reviewCount: dashboard.reviews.length,
    adCount: dashboard.ads.length,
    productCount: dashboard.products.length,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  try {
    const result = await importMerchantDemo(session.shop);
    if (!result.ok) return result;
    const params = new URLSearchParams();
    params.set("notice", result.message);
    if (result.warning) params.set("warning", result.warning);
    throw redirect(`/app?${params.toString()}`);
  } catch (error) {
    if (error instanceof Response) throw error;
    return actionError("import-demo", error);
  }
};

export default function ImportPage() {
  const counts = useLoaderData<typeof loader>();
  const actionData = useActionData<MerchantActionResult>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  return (
    <s-page heading="Import">
      {actionData?.ok === false && actionData.error ? (
        <s-banner heading="Import failed" tone="critical">
          {actionData.error}
        </s-banner>
      ) : null}

      <s-section heading="Labelled rain-jacket demo">
        <s-paragraph>
          This dataset is labelled demo attribution. It is not a live Meta or
          Google Ads pull. Repeated imports are idempotent on source ID.
        </s-paragraph>
        <s-paragraph>
          Reviews praise staying dry and sealed pockets. Historical ads that
          emphasize waterproofing have stronger CTR, conversion
          (purchases/clicks), and ROAS than style-first ads in the same period.
        </s-paragraph>
        <s-paragraph>
          Currently stored: {counts.reviewCount} reviews, {counts.adCount} ad
          rows, {counts.productCount} products. Sync products on the dashboard
          first if you want this evidence attached to a real Shopify rain
          jacket.
        </s-paragraph>
        <Form method="post">
          <input type="hidden" name="intent" value="import-demo" />
          <s-button type="submit" variant="primary" disabled={submitting}>
            Load labelled demo
          </s-button>
        </Form>
      </s-section>

      <s-section heading="CSV / JSON later">
        <s-paragraph>
          Custom file upload uses the same import validators. For this pass,
          the labelled demo is the path that fills the dashboard.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
