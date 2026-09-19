import { syncShopifyProductsAndIndex, type ShopifyGraphqlExecutor } from "@htn26/backend";
import type { ActionFunctionArgs } from "react-router";
import { Form, useActionData, useNavigation } from "react-router";
import { authenticateMerchant, reportRouteError, requireSearchPlatform } from "../platform.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  let merchantId: string | undefined;
  try {
    const authenticated = await authenticateMerchant(request);
    merchantId = authenticated.merchantId;
    const platform = await requireSearchPlatform();
    const executeGraphql: ShopifyGraphqlExecutor = async <T,>(query: string, variables: Record<string, unknown>) => {
      const response = await authenticated.admin.graphql(query, { variables });
      const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
      if (body.errors?.length) throw new Error(body.errors.map((error) => error.message).join("; "));
      if (!body.data) throw new Error("Shopify GraphQL returned no data");
      return body.data;
    };
    const result = await syncShopifyProductsAndIndex({
      merchantId,
      executeGraphql,
      repository: platform.repositories,
      elastic: platform.elastic,
    });
    return { ok: true as const, result };
  } catch (error) {
    return { ok: false as const, error: reportRouteError(error, "shopify.product_sync", merchantId) };
  }
};

export default function SyncProducts() {
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  return (
    <s-page heading="Sync Shopify products">
      <s-section heading="Product synchronization">
        <s-paragraph>Fetch every product through the authenticated Shopify Admin GraphQL API, then persist and index it.</s-paragraph>
        <Form method="post">
          <s-button type="submit" {...(navigation.state !== "idle" ? { loading: true } : {})}>Sync now</s-button>
        </Form>
        {result?.ok && <s-paragraph>Synced {result.result.synced} product(s) across {result.result.pages} page(s).</s-paragraph>}
        {result && !result.ok && <s-paragraph>Error: {result.error}</s-paragraph>}
      </s-section>
    </s-page>
  );
}
