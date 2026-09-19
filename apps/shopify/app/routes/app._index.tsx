import { getDashboardMetrics } from "@htn26/backend";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticateMerchant } from "../platform.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, merchantId, database } = await authenticateMerchant(request);
  const products = await database.repositories.listProducts({ merchantId });
  const selectedProduct = products[0];
  const metrics = await getDashboardMetrics({
    merchantId,
    repository: database.repositories,
    ...(selectedProduct ? { productId: selectedProduct.id } : {}),
  });
  return { shop: session.shop, products, selectedProduct, metrics };
};

function metric(value: number | null): string {
  return value === null ? "Unavailable" : value.toFixed(2);
}

function percent(value: number | null): string {
  return metric(value === null ? null : value * 100);
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const group = data.metrics.groups[0];
  return (
    <s-page heading="Marketing Copilot">
      <s-section heading="Connected store">
        <s-paragraph>{data.shop}</s-paragraph>
        <s-paragraph>{data.products.length} product(s) synchronized.</s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-link href="/app/sync">Sync products</s-link>
          <s-link href="/app/import">Import reviews and ads</s-link>
        </s-stack>
      </s-section>
      <s-section heading="Campaign metrics">
        {group ? (
          <s-stack direction="block" gap="base">
            <s-paragraph>Impressions: {group.totals.impressions.toLocaleString()}</s-paragraph>
            <s-paragraph>Clicks: {group.totals.clicks.toLocaleString()}</s-paragraph>
            <s-paragraph>Purchases: {group.totals.purchases.toLocaleString()}</s-paragraph>
            <s-paragraph>CTR: {percent(group.metrics.ctr.value)}%</s-paragraph>
            <s-paragraph>Conversion rate: {percent(group.metrics.conversionRate.value)}%</s-paragraph>
            <s-paragraph>ROAS: {metric(group.metrics.roas.value)}x</s-paragraph>
          </s-stack>
        ) : (
          <s-paragraph>No ad performance is available yet. Load the demo or import campaign data.</s-paragraph>
        )}
      </s-section>
      <s-section heading="Products">
        {data.products.length ? data.products.map((product) => (
          <s-paragraph key={product.id}>{product.title} — {product.price} {product.currency}</s-paragraph>
        )) : <s-paragraph>No products synchronized yet.</s-paragraph>}
      </s-section>
    </s-page>
  );
}
