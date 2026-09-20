import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  actionError,
  importMerchantDemo,
  loadMerchantDashboard,
  syncMerchantProducts,
  type CopilotStatusTone,
  type MerchantActionResult,
} from "../lib/merchant-data.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return loadMerchantDashboard(session.shop);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const intent = String((await request.formData()).get("intent") || "");
  try {
    if (intent === "sync") return await syncMerchantProducts(session.shop, admin);
    if (intent === "import-demo") return await importMerchantDemo(session.shop);
    return actionError("sync", new Error("Unknown action"));
  } catch (error) {
    return actionError(intent === "import-demo" ? "import-demo" : "sync", error);
  }
};

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(amount);
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusLabel(tone: CopilotStatusTone) {
  if (tone === "ok") return "Working";
  if (tone === "ready") return "Ready to run";
  return "Not yet";
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<MerchantActionResult>();
  const navigation = useNavigation();
  const [params] = useSearchParams();
  const submitting = navigation.state === "submitting";
  const intent = String(navigation.formData?.get("intent") || "");
  const notice = actionData?.ok ? actionData.message : params.get("notice");
  const warning = actionData?.warning ?? params.get("warning") ?? undefined;
  const error = actionData?.ok === false ? actionData.error : params.get("error");
  const working = data.findings.filter((finding) => finding.kind === "working");
  const weaker = data.findings.filter((finding) => finding.kind === "weaker");
  const insufficient = data.findings.filter((finding) => finding.kind === "insufficient");
  const hasShopifyProducts = data.products.some((product) => !product.demo);
  const hasAds = data.ads.length > 0;
  const comparisonThemes = data.themes.filter((theme) => theme.adCount > 0);

  return (
    <s-page heading="Dashboard">
      {notice ? <s-banner heading="Saved" tone="success">{notice}</s-banner> : null}
      {warning ? <s-banner heading="Search index" tone="info">{warning}</s-banner> : null}
      {error ? (
        <s-banner heading="Could not finish that step" tone="critical">
          {error}
        </s-banner>
      ) : null}

      <s-section heading="Get catalog and evidence in">
        <s-paragraph>
          Sign-in is working. Sync real products from this shop, then import the
          labelled rain-jacket reviews and historical ads. The copilot compares
          waterproof vs style-first messaging using CTR (clicks/impressions),
          conversion (purchases/clicks), and ROAS. It will not claim that
          historical correlations prove causation.
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          <Form method="post">
            <input type="hidden" name="intent" value="sync" />
            <s-button
              type="submit"
              variant="primary"
              disabled={submitting}
              {...(submitting && intent === "sync" ? { loading: true } : {})}
            >
              Sync products
            </s-button>
          </Form>
          <Form method="post">
            <input type="hidden" name="intent" value="import-demo" />
            <s-button
              type="submit"
              variant="secondary"
              disabled={submitting}
              {...(submitting && intent === "import-demo" ? { loading: true } : {})}
            >
              Import labelled demo
            </s-button>
          </Form>
        </s-stack>
      </s-section>

      {!hasShopifyProducts || !hasAds ? (
        <s-section heading="Next step">
          <s-unordered-list>
            {!hasShopifyProducts ? (
              <s-list-item>
                Sync products so the dashboard can show this shop’s catalog.
              </s-list-item>
            ) : null}
            {!hasAds ? (
              <s-list-item>
                Import the labelled demo to see which messaging looks stronger.
                Shopify does not provide reviews through the core product API.
              </s-list-item>
            ) : null}
          </s-unordered-list>
        </s-section>
      ) : null}

      <s-section heading="Copilot status">
        <s-paragraph>
          What is wired for this shop versus what is still a later milestone.
        </s-paragraph>
        <s-unordered-list>
          {data.status.map((item) => (
            <s-list-item key={item.id}>
              {statusLabel(item.tone)} — {item.label}: {item.detail}
            </s-list-item>
          ))}
        </s-unordered-list>
      </s-section>

      {working.map((finding) => (
        <s-section key={finding.title} heading="What's working">
          <s-paragraph>
            Observation. {finding.title}. {finding.observation}
          </s-paragraph>
          <s-paragraph>
            Supporting sources: {finding.supportingSourceIds.join(", ")}
          </s-paragraph>
          <s-unordered-list>
            {finding.limitations.map((limitation) => (
              <s-list-item key={limitation}>{limitation}</s-list-item>
            ))}
          </s-unordered-list>
        </s-section>
      ))}

      {weaker.map((finding) => (
        <s-section key={finding.title} heading="What's not working as well">
          <s-paragraph>
            Observation. {finding.title}. {finding.observation}
          </s-paragraph>
          <s-paragraph>
            Supporting sources: {finding.supportingSourceIds.join(", ")}
          </s-paragraph>
          <s-unordered-list>
            {finding.limitations.map((limitation) => (
              <s-list-item key={limitation}>{limitation}</s-list-item>
            ))}
          </s-unordered-list>
        </s-section>
      ))}

      {insufficient.map((finding) => (
        <s-section key={finding.title} heading="What's working">
          <s-banner heading={finding.title} tone="info">
            {finding.observation}
          </s-banner>
        </s-section>
      ))}

      {comparisonThemes.length > 0 ? (
        <s-section heading="Messaging comparison">
          <s-paragraph>
            Themes are grouped from ad copy and review text. CTR uses
            impressions as the denominator; conversion uses clicks.
          </s-paragraph>
          <s-unordered-list>
            {comparisonThemes.map((theme) => (
              <s-list-item key={theme.theme}>
                {theme.label}: {theme.adCount} ads, {theme.reviewCount} reviews,
                CTR {theme.ctr}, conversion {theme.conversionRate}, ROAS{" "}
                {theme.roas}
              </s-list-item>
            ))}
          </s-unordered-list>
        </s-section>
      ) : null}

      {data.metrics.groups.map((group) => (
        <s-section
          key={`${group.currency}-${group.periodStart}`}
          heading="Period totals"
        >
          <s-paragraph>
            {shortDate(group.periodStart)} – {shortDate(group.periodEnd)} ·{" "}
            {group.currency}. Spend {money(group.totals.spend, group.currency)};
            attributed revenue {money(group.totals.attributedRevenue, group.currency)}.
            CTR {group.ctr}; conversion {group.conversionRate}; ROAS {group.roas}.
          </s-paragraph>
        </s-section>
      ))}

      <s-section heading="Products">
        {data.products.length === 0 ? (
          <s-paragraph>
            No products stored for this shop yet. Sync from Shopify to fill this
            list.
          </s-paragraph>
        ) : (
          <s-unordered-list>
            {data.products.map((product) => (
              <s-list-item key={product.id}>
                {product.title} · {product.demo ? "demo" : "Shopify"} ·{" "}
                {money(Number(product.price), product.currency)} ·{" "}
                {product.reviewCount} reviews · {product.adCount} ads
              </s-list-item>
            ))}
          </s-unordered-list>
        )}
      </s-section>

      <s-section heading="Historical ads">
        {data.ads.length === 0 ? (
          <s-paragraph>
            No ad performance yet. Import the labelled demo — attribution will
            show as demo, not live Meta/Google Ads.
          </s-paragraph>
        ) : (
          <s-unordered-list>
            {data.ads.map((ad) => (
              <s-list-item key={ad.sourceId}>
                {ad.messaging} · {ad.theme} · {ad.channel} · {ad.attribution} ·
                CTR {ad.ctr} · conv {ad.conversionRate} · ROAS {ad.roas}
              </s-list-item>
            ))}
          </s-unordered-list>
        )}
      </s-section>

      <s-section heading="Customer reviews">
        {data.reviews.length === 0 ? (
          <s-paragraph>
            No reviews stored. Treat reviews as an imported source — they are
            not pulled from Shopify.
          </s-paragraph>
        ) : (
          <s-unordered-list>
            {data.reviews.map((review) => (
              <s-list-item key={review.sourceId}>
                {review.rating}/5 · {review.attribution} · {review.text}
              </s-list-item>
            ))}
          </s-unordered-list>
        )}
      </s-section>

      <s-section heading="Generate campaign">
        <s-paragraph>
          Generation needs the OpenAI analyze → generate → claim-check workflow.
          That stage is not wired yet, so this stays disabled even if evidence
          is present.
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-button disabled variant="primary">
            Generate campaign
          </s-button>
          <s-link href="/app/campaigns">Campaign history</s-link>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
