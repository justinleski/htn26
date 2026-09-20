import type {
  AdPerformance,
  Insight,
  MessagingTheme,
  Platform,
  Product,
  Review,
} from "./types";

export interface DashboardMetricValue {
  value?: number | null;
  reason?: string;
}

export interface DashboardFinding {
  kind?: "working" | "weaker" | "insufficient";
  title?: string;
  observation?: string;
  supportingSourceIds?: string[];
  observedMetrics?: Record<string, DashboardMetricValue | number | null>;
  limitations?: string[];
}

export interface DashboardProductRow {
  id?: string;
  title?: string;
  shopifyId?: string;
  price?: string | number;
  currency?: string;
  demo?: boolean;
  productId?: string;
}

export interface DashboardAdRow {
  id?: string;
  sourceId?: string;
  productId?: string;
  productTitle?: string;
  name?: string;
  messaging?: string;
  channel?: string;
  theme?: string;
  caption?: string;
  impressions?: number;
  clicks?: number;
  purchases?: number;
  spend?: number;
  ctr?: string | number;
  conversionRate?: string | number;
  mediaType?: AdPerformance["mediaType"];
  hashtags?: string[];
}

export interface DashboardReviewRow {
  id?: string;
  sourceId?: string;
  productId?: string;
  productTitle?: string;
  rating?: number;
  text?: string;
  source?: string;
  attribution?: string;
  reviewedAt?: string;
  date?: string;
  themes?: string[];
}

export interface DashboardPayload {
  shop?: string;
  storeName?: string;
  products?: DashboardProductRow[];
  ads?: DashboardAdRow[];
  reviews?: DashboardReviewRow[];
  findings?: DashboardFinding[];
  dashboard?: DashboardPayload;
}

export interface AdaptedDashboard {
  products: Product[];
  ads: AdPerformance[];
  reviews: Review[];
  insight: Insight | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function unwrapDashboard(raw: unknown): DashboardPayload {
  const record = asRecord(raw);
  if (!record) return { products: [], ads: [], reviews: [], findings: [] };
  const nested = asRecord(record.dashboard);
  if (nested && Array.isArray(nested.products)) {
    return nested as DashboardPayload;
  }
  return record as DashboardPayload;
}

export function isDashboardEmpty(payload: DashboardPayload): boolean {
  return (payload.ads?.length ?? 0) === 0;
}

function parsePrice(value: string | number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function ratio(numerator: number | undefined, denominator: number | undefined): number | null {
  if (typeof numerator !== "number" || typeof denominator !== "number") return null;
  if (denominator === 0) return null;
  return numerator / denominator;
}

function parseRatio(value: string | number | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1 ? value / 100 : value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const match = trimmed.match(/-?\d+(?:\.\d+)?/);
    if (!match) return fallback;
    const parsed = parseFloat(match[0]);
    if (!Number.isFinite(parsed)) return fallback;
    if (trimmed.includes("%") || parsed > 1) return parsed / 100;
    return parsed;
  }
  return fallback;
}

export function mapChannel(channel: string | undefined): Platform {
  const value = (channel ?? "").toLowerCase();
  if (value.includes("instagram") || value === "ig") return "Instagram";
  if (value.includes("tiktok")) return "TikTok";
  if (value.includes("google") || value.includes("youtube") || value.includes("search")) {
    return "Google";
  }
  return "Facebook";
}

export function mapTheme(theme: string | undefined, messaging = ""): MessagingTheme {
  const hay = `${theme ?? ""} ${messaging}`.toLowerCase();
  if (/\b(waterproof|stay-dry|stay dry|rain|downpour|sealed)\b/.test(hay)) return "waterproof";
  if (/\b(style|silhouette|colour|color|design|fashion)\b/.test(hay)) return "style";
  if (/\bdurab/.test(hay)) return "durability";
  if (/\b(price|value|cheap|affordable)\b/.test(hay)) return "price";
  if (/\b(comfort|fit)\b/.test(hay)) return "comfort";
  return "comfort";
}

function metricNumber(value: DashboardMetricValue | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && typeof value.value === "number") return value.value;
  return null;
}

function formatFindingStat(finding: DashboardFinding): string {
  const metrics = finding.observedMetrics ?? {};
  const parts: string[] = [];

  for (const [key, raw] of Object.entries(metrics)) {
    const value = metricNumber(raw);
    if (value == null) continue;
    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (ch) => ch.toLowerCase());
    if (/roas/i.test(key)) {
      parts.push(`${label} ${value.toFixed(2)}x`);
    } else {
      parts.push(`${label} ${(value * 100).toFixed(1)}%`);
    }
  }

  if (parts.length > 0) return parts.join(" · ");
  return "Observation from imported historical rows — not a causal claim.";
}

function adaptFinding(finding: DashboardFinding, products: Product[], ads: AdPerformance[]): Insight {
  const supporting = finding.supportingSourceIds ?? [];
  const adIds = new Set(ads.map((ad) => ad.id));
  const sourceAdIds = supporting.filter((id) => adIds.has(id));
  const sourceProductIds =
    products.length > 0
      ? products
          .filter((product) =>
            ads.some((ad) => ad.productId === product.id && sourceAdIds.includes(ad.id)),
          )
          .map((product) => product.id)
      : [];

  const limitations = (finding.limitations ?? []).join(" ").trim();

  return {
    id: `finding-${finding.kind ?? "top"}`,
    headline: finding.title?.trim() || "What the historical rows show",
    explanation:
      finding.observation?.trim() ||
      "Not enough comparable rows yet to describe a pattern.",
    supportingStat: formatFindingStat(finding),
    sourceProductIds: sourceProductIds.length > 0 ? sourceProductIds : products.map((p) => p.id),
    sourceAdIds: sourceAdIds.length > 0 ? sourceAdIds : ads.map((ad) => ad.id),
    limitations:
      limitations ||
      "This is an observation from the available rows, not proof that messaging caused the difference.",
  };
}

function matchProductId(
  products: Product[],
  rows: DashboardProductRow[],
  productId: string | undefined,
  productTitle: string | undefined,
): string {
  if (productId) {
    const byId = products.find((product) => product.id === productId);
    if (byId) return byId.id;
  }
  if (productTitle) {
    const byTitle = products.find(
      (product) => product.title.toLowerCase() === productTitle.toLowerCase(),
    );
    if (byTitle) return byTitle.id;
    const byShopify = rows.find(
      (row) => row.shopifyId === productId || row.title === productTitle,
    );
    if (byShopify?.id) return byShopify.id;
  }
  return products[0]?.id ?? productId ?? "unknown-product";
}

export function adaptDashboard(raw: unknown): AdaptedDashboard {
  const payload = unwrapDashboard(raw);
  const productRows = payload.products ?? [];

  const products: Product[] = productRows.map((row, index) => ({
    id: row.id ?? row.productId ?? row.shopifyId ?? `product-${index}`,
    title: row.title?.trim() || "Untitled product",
    price: parsePrice(row.price),
    currency: row.currency?.trim() || "USD",
    tags: row.demo ? ["demo"] : [],
  }));

  const ads: AdPerformance[] = (payload.ads ?? []).map((row, index) => {
    const clicks = row.clicks ?? 0;
    const computedCtr = ratio(row.clicks, row.impressions);
    const computedCvr = ratio(row.purchases, row.clicks);
    const messaging = row.messaging ?? row.caption ?? "";

    return {
      id: row.sourceId ?? row.id ?? `ad-${index}`,
      productId: matchProductId(products, productRows, row.productId, row.productTitle),
      name: row.name?.trim() || messaging || row.productTitle || `Ad ${index + 1}`,
      theme: mapTheme(row.theme, messaging),
      mediaType: row.mediaType ?? "image",
      caption: messaging,
      hashtags: row.hashtags ?? [],
      platformBreakdown: [
        {
          platform: mapChannel(row.channel),
          ctr: computedCtr ?? parseRatio(row.ctr, 0),
          ctaClicks: clicks,
          conversionRate: computedCvr ?? parseRatio(row.conversionRate, 0),
          spend: row.spend ?? 0,
        },
      ],
    };
  });

  const reviews: Review[] = (payload.reviews ?? []).map((row, index) => ({
    id: row.sourceId ?? row.id ?? `review-${index}`,
    productId: matchProductId(products, productRows, row.productId, row.productTitle),
    rating: row.rating ?? 0,
    text: row.text ?? "",
    source: row.source ?? row.attribution ?? "imported",
    date: row.reviewedAt ?? row.date ?? "",
    themes: row.themes ?? [],
  }));

  const finding = payload.findings?.[0];
  const insight = finding ? adaptFinding(finding, products, ads) : null;

  return { products, ads, reviews, insight };
}
