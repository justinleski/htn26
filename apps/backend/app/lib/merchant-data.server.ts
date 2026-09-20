import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { getElasticClient } from "./elastic.server";
import {
  getEnv,
  hasElastic,
  hasOpenAi,
  hasSentry,
  hasGoogleOAuthClient,
} from "./env.server";
import { buildDashboardFindings, formatRatio, formatRoas } from "../../src/dashboard/findings.js";
import { getDashboardMetrics } from "../../src/dashboard/metrics.js";
import {
  createPrismaRepositories,
  type PrismaDataClient,
} from "../../src/database/prisma-repositories.js";
import { loadDemoDataset } from "../../src/demo/load.js";
import {
  DEMO_PRODUCT_ALIAS,
  DEMO_PRODUCT_SHOPIFY_ID,
  isDemoShopifyId,
  pickRainJacketProduct,
} from "../../src/demo/match.js";
import {
  ensureEvidenceIndex,
  indexEvidence,
  type ElasticDataClient,
  type ElasticIndexAdminClient,
} from "../../src/elasticsearch/data-index.js";
import type { AdPerformance, Product, Review } from "../../src/schemas.js";
import {
  syncShopifyProducts,
  type ShopifyGraphqlExecutor,
} from "../../src/shopify/products.js";
import { calculateAdMetrics } from "../../src/metrics/index.js";
import { captureAppError, traceAppOperation } from "./sentry.server";

export type CopilotStatusTone = "ok" | "ready" | "blocked";

export interface CopilotStatusItem {
  id: string;
  label: string;
  detail: string;
  tone: CopilotStatusTone;
}

export interface MerchantActionResult {
  ok: boolean;
  intent: "sync" | "import-demo";
  message: string;
  warning?: string;
  error?: string;
}

export interface DashboardProductRow {
  id: string;
  title: string;
  shopifyId: string;
  price: string;
  currency: string;
  demo: boolean;
  reviewCount: number;
  adCount: number;
}

export interface DashboardAdRow {
  sourceId: string;
  productTitle: string;
  messaging: string;
  channel: string;
  theme: string;
  attribution: string;
  impressions: number;
  clicks: number;
  purchases: number;
  spend: number;
  attributedRevenue: number;
  currency: string;
  ctr: string;
  conversionRate: string;
  roas: string;
}

function repositories() {
  return createPrismaRepositories(prisma as unknown as PrismaDataClient);
}

export async function ensureMerchant(shopDomain: string) {
  return prisma.merchant.upsert({
    where: { shopDomain },
    create: { shopDomain, settings: {} },
    update: {},
  });
}

function createGraphqlExecutor(admin: AdminApiContext): ShopifyGraphqlExecutor {
  return async (query, variables) => {
    const response = await admin.graphql(query, { variables });
    const json = (await response.json()) as {
      data?: unknown;
      errors?: Array<{ message: string }>;
    };
    if (json.errors?.length) {
      throw new Error(json.errors.map((error) => error.message).join("; "));
    }
    if (!json.data) throw new Error("Shopify GraphQL returned no data");
    return json.data as never;
  };
}

async function tryIndex(
  records: Array<Product | Review | AdPerformance>,
): Promise<string | undefined> {
  if (records.length === 0) return undefined;
  if (!hasElastic()) {
    return "Search indexing skipped — Elasticsearch is not configured yet. Postgres is the source of truth.";
  }
  const client = getElasticClient();
  if (!client) {
    return "Search indexing skipped — Elasticsearch client was unavailable.";
  }
  try {
    await ensureEvidenceIndex(client as unknown as ElasticIndexAdminClient);
    await indexEvidence(client as unknown as ElasticDataClient, records);
    return undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Records saved in Postgres, but Elasticsearch indexing failed: ${message}`;
  }
}

async function resolveDemoProduct(merchantId: string) {
  const repos = repositories();
  const products = await repos.listProducts({ merchantId });
  const matched = pickRainJacketProduct(products);
  if (matched) {
    return {
      id: matched.id,
      title: matched.title,
      source: isDemoShopifyId(matched.shopifyId) ? "demo" : "shopify",
    } as const;
  }

  const record = await prisma.product.upsert({
    where: {
      merchantId_shopifyId: {
        merchantId,
        shopifyId: DEMO_PRODUCT_SHOPIFY_ID,
      },
    },
    create: {
      merchantId,
      shopifyId: DEMO_PRODUCT_SHOPIFY_ID,
      title: "Rain jacket (labelled demo)",
      description:
        "Placeholder product for labelled rain-jacket reviews and historical ads. Sync your Shopify catalog to attach this evidence to a real product.",
      price: "0",
      currency: "CAD",
      attributes: { demo: true, handle: DEMO_PRODUCT_ALIAS },
      sourceUpdatedAt: new Date(),
    },
    update: {},
  });

  return { id: record.id, title: record.title, source: "demo" } as const;
}

async function syncMerchantProductsImpl(
  shop: string,
  admin: AdminApiContext,
): Promise<MerchantActionResult> {
  const merchant = await ensureMerchant(shop);
  const repos = repositories();
  const result = await syncShopifyProducts({
    merchantId: merchant.id,
    executeGraphql: createGraphqlExecutor(admin),
    repository: repos,
  });
  const products = await repos.listProducts({ merchantId: merchant.id });
  const warning = await tryIndex(products);
  const message =
    result.synced === 0
      ? "Synced 0 products. Add products in Shopify Admin, then sync again."
      : `Synced ${result.synced} product${result.synced === 1 ? "" : "s"} from Shopify.`;
  return { ok: true, intent: "sync", message, ...(warning ? { warning } : {}) };
}

async function importMerchantDemoImpl(shop: string): Promise<MerchantActionResult> {
  const merchant = await ensureMerchant(shop);
  const repos = repositories();
  const target = await resolveDemoProduct(merchant.id);
  const loaded = await loadDemoDataset({
    merchantId: merchant.id,
    repository: repos,
    productIdMap: { [DEMO_PRODUCT_ALIAS]: target.id },
  });

  const warning = await tryIndex([
    ...loaded.reviews.records.map((record) => ({ id: record.sourceId, ...record })),
    ...loaded.ads.records.map((record) => ({ id: record.sourceId, ...record })),
  ]);

  const attached =
    target.source === "shopify"
      ? `Attached to Shopify product “${target.title}”.`
      : `Attached to labelled demo product “${target.title}”. Sync your catalog first to use a real product.`;

  return {
    ok: true,
    intent: "import-demo",
    message: `Imported ${loaded.reviews.unique} labelled reviews and ${loaded.ads.unique} historical ads (demo attribution). ${attached}`,
    ...(warning ? { warning } : {}),
  };
}

async function loadMerchantDashboardImpl(shop: string) {
  const merchant = await ensureMerchant(shop);
  const repos = repositories();
  const [products, ads, reviews, campaignCount] = await Promise.all([
    repos.listProducts({ merchantId: merchant.id }),
    repos.listAdPerformance({ merchantId: merchant.id }),
    repos.listReviews({ merchantId: merchant.id }),
    prisma.campaign.count({ where: { merchantId: merchant.id } }),
  ]);
  const metrics = await getDashboardMetrics({
    merchantId: merchant.id,
    repository: repos,
  });
  const { findings, themes } = buildDashboardFindings({ ads, reviews });
  const productTitle = new Map(products.map((product) => [product.id, product.title]));
  const env = getEnv();

  const productRows: DashboardProductRow[] = products.map((product) => ({
    id: product.id,
    title: product.title,
    shopifyId: product.shopifyId,
    price: product.price,
    currency: product.currency,
    demo: isDemoShopifyId(product.shopifyId),
    reviewCount: reviews.filter((review) => review.productId === product.id).length,
    adCount: ads.filter((ad) => ad.productId === product.id).length,
  }));

  const adRows: DashboardAdRow[] = ads.map((ad) => {
    const calculated = calculateAdMetrics(ad);
    const theme = themes.find((entry) => entry.sourceIds.includes(ad.sourceId));
    return {
      sourceId: ad.sourceId,
      productTitle: productTitle.get(ad.productId) ?? ad.productId,
      messaging: ad.messaging,
      channel: ad.channel,
      theme: theme?.label ?? "Other messaging",
      attribution: ad.attribution,
      impressions: ad.impressions,
      clicks: ad.clicks,
      purchases: ad.purchases,
      spend: ad.spend,
      attributedRevenue: ad.attributedRevenue,
      currency: ad.currency,
      ctr: formatRatio(calculated.ctr),
      conversionRate: formatRatio(calculated.conversionRate),
      roas: formatRoas(calculated.roas),
    };
  });

  const demoReviewCount = reviews.filter((review) => review.attribution === "demo").length;
  const demoAdCount = ads.filter((ad) => ad.attribution === "demo").length;
  const shopifyProductCount = products.filter((product) => !isDemoShopifyId(product.shopifyId)).length;

  const status: CopilotStatusItem[] = [
    {
      id: "auth",
      label: "Shopify sign-in",
      detail: `Signed in as ${shop}`,
      tone: "ok",
    },
    {
      id: "products",
      label: "Product sync",
      detail:
        shopifyProductCount > 0
          ? `${shopifyProductCount} Shopify product${shopifyProductCount === 1 ? "" : "s"} in Postgres`
          : "Not synced yet — use Sync products",
      tone: shopifyProductCount > 0 ? "ok" : "ready",
    },
    {
      id: "import",
      label: "Reviews & ads",
      detail:
        ads.length + reviews.length > 0
          ? `${reviews.length} reviews (${demoReviewCount} demo), ${ads.length} ad rows (${demoAdCount} demo)`
          : "Not imported yet — load the labelled rain-jacket demo",
      tone: ads.length > 0 ? "ok" : "ready",
    },
    {
      id: "metrics",
      label: "Metrics in code",
      detail: metrics.hasData
        ? "CTR = clicks/impressions, conversion = purchases/clicks, ROAS = attributed revenue/spend"
        : "Waiting on ad rows",
      tone: metrics.hasData ? "ok" : "ready",
    },
    {
      id: "findings",
      label: "What's working",
      detail: findings.some((finding) => finding.kind === "working")
        ? "Evidence-backed observations from reviews and historical ads"
        : "Need comparable waterproof vs style-first ad rows",
      tone: findings.some((finding) => finding.kind === "working") ? "ok" : "ready",
    },
    {
      id: "search",
      label: "Elasticsearch",
      detail: hasElastic(env)
        ? "Configured — indexing is best-effort after sync/import"
        : "Not configured (ELASTIC_URL / ELASTIC_API_KEY empty)",
      tone: hasElastic(env) ? "ok" : "blocked",
    },
    {
      id: "ai",
      label: "Generate campaign",
      detail: hasOpenAi(env)
        ? "API key present, but analyze → generate → claim-check is not wired yet"
        : "Not wired yet (OPENAI_API_KEY empty)",
      tone: "blocked",
    },
    {
      id: "campaigns",
      label: "Saved campaigns",
      detail:
        campaignCount > 0
          ? `${campaignCount} saved`
          : "None saved — generate/save/reopen is not built yet",
      tone: campaignCount > 0 ? "ok" : "blocked",
    },
    {
      id: "sentry",
      label: "Sentry",
      detail: hasSentry(env) ? "DSN present" : "Not configured (SENTRY_DSN empty)",
      tone: hasSentry(env) ? "ok" : "blocked",
    },
    {
      id: "ga",
      label: "Google Analytics",
      detail: hasGoogleOAuthClient(env)
        ? "OAuth client present; live pull is out of this pass"
        : "Connect is deferred — no live GA pull in this pass",
      tone: "blocked",
    },
  ];

  return {
    shop,
    merchantId: merchant.id,
    products: productRows,
    ads: adRows,
    reviews: reviews.map((review) => ({
      sourceId: review.sourceId,
      productTitle: productTitle.get(review.productId) ?? review.productId,
      rating: review.rating,
      text: review.text,
      attribution: review.attribution,
      reviewedAt: review.reviewedAt,
    })),
    metrics: {
      hasData: metrics.hasData,
      adCount: metrics.adCount,
      groups: metrics.groups.map((group) => ({
        currency: group.currency,
        periodStart: group.periodStart,
        periodEnd: group.periodEnd,
        totals: group.totals,
        ctr: formatRatio(group.metrics.ctr),
        conversionRate: formatRatio(group.metrics.conversionRate),
        roas: formatRoas(group.metrics.roas),
      })),
    },
    themes: themes.map((theme) => ({
      theme: theme.theme,
      label: theme.label,
      adCount: theme.adCount,
      reviewCount: theme.reviewCount,
      reviewExcerpts: theme.reviewExcerpts,
      totals: theme.totals,
      ctr: formatRatio(theme.metrics.ctr),
      conversionRate: formatRatio(theme.metrics.conversionRate),
      roas: formatRoas(theme.metrics.roas),
    })),
    findings,
    status,
    campaignCount,
    canGenerate: false,
  };
}

export function syncMerchantProducts(
  shop: string,
  admin: AdminApiContext,
): Promise<MerchantActionResult> {
  return traceAppOperation("shopify.product_sync", () =>
    syncMerchantProductsImpl(shop, admin),
  );
}

export function importMerchantDemo(shop: string): Promise<MerchantActionResult> {
  return traceAppOperation("data.demo_import", () => importMerchantDemoImpl(shop));
}

export function loadMerchantDashboard(shop: string) {
  return traceAppOperation("dashboard.load", () => loadMerchantDashboardImpl(shop));
}

export function actionError(intent: MerchantActionResult["intent"], error: unknown): MerchantActionResult {
  captureAppError(error, intent);
  return {
    ok: false,
    intent,
    message: "",
    error: error instanceof Error ? error.message : String(error),
  };
}
