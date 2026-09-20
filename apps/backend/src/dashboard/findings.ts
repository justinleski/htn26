import { calculateAdMetrics, groupAdMetrics, type AdMetrics, type MetricResult } from "../metrics/index.js";
import type { AdPerformance, Review } from "../schemas.js";

export type MessagingTheme = "waterproof" | "style" | "other";

const WATERPROOF_PATTERN =
  /\b(dry|drier|waterproof|rain|downpour|sealed|water|wet|hood|beaded)\b/i;
const STYLE_PATTERN =
  /\b(silhouette|style|colour|color|design|favourite|favorite|city layer|clean)\b/i;

function countHits(text: string, pattern: RegExp): number {
  return [...text.matchAll(new RegExp(pattern.source, "gi"))].length;
}

export function classifyMessaging(text: string): MessagingTheme {
  const waterproofHits = countHits(text, WATERPROOF_PATTERN);
  const styleHits = countHits(text, STYLE_PATTERN);
  if (waterproofHits === 0 && styleHits === 0) return "other";
  if (waterproofHits === styleHits) return "other";
  return waterproofHits > styleHits ? "waterproof" : "style";
}

export function formatRatio(metric: MetricResult): string {
  if (metric.value == null) {
    if (metric.reason === "zero-denominator") return "n/a (zero denominator)";
    if (metric.reason === "missing-value") return "n/a (missing value)";
    return "n/a";
  }
  return `${(metric.value * 100).toFixed(1)}%`;
}

export function formatRoas(metric: MetricResult): string {
  if (metric.value == null) {
    if (metric.reason === "zero-denominator") return "n/a (zero denominator)";
    if (metric.reason === "missing-value") return "n/a (missing value)";
    return "n/a";
  }
  return `${metric.value.toFixed(2)}x`;
}

export interface ThemePerformance {
  theme: MessagingTheme;
  label: string;
  adCount: number;
  reviewCount: number;
  sourceIds: string[];
  reviewExcerpts: string[];
  totals: {
    impressions: number;
    clicks: number;
    purchases: number;
    spend: number;
    attributedRevenue: number;
  };
  metrics: AdMetrics;
}

export interface DashboardFinding {
  kind: "working" | "weaker" | "insufficient";
  title: string;
  observation: string;
  supportingSourceIds: string[];
  observedMetrics: Record<string, MetricResult>;
  limitations: string[];
}

const THEME_LABEL: Record<MessagingTheme, string> = {
  waterproof: "Waterproof / stay-dry",
  style: "Style-first",
  other: "Other messaging",
};

const SHARED_LIMITATIONS = [
  "This is an observation from the available rows, not proof that messaging caused the difference.",
  "Do not infer campaign revenue from total Shopify sales.",
  "Currencies and reporting periods are not combined.",
];

function emptyTotals() {
  return { impressions: 0, clicks: 0, purchases: 0, spend: 0, attributedRevenue: 0 };
}

export function summarizeThemes(options: {
  ads: AdPerformance[];
  reviews: Review[];
}): ThemePerformance[] {
  const adsByTheme = new Map<MessagingTheme, AdPerformance[]>();
  for (const ad of options.ads) {
    const theme = classifyMessaging(ad.messaging);
    const list = adsByTheme.get(theme) ?? [];
    list.push(ad);
    adsByTheme.set(theme, list);
  }

  const reviewsByTheme = new Map<MessagingTheme, Review[]>();
  for (const review of options.reviews) {
    const theme = classifyMessaging(review.text);
    const list = reviewsByTheme.get(theme) ?? [];
    list.push(review);
    reviewsByTheme.set(theme, list);
  }

  return (["waterproof", "style", "other"] as const)
    .map((theme) => {
      const ads = adsByTheme.get(theme) ?? [];
      const reviews = reviewsByTheme.get(theme) ?? [];
      const groups = groupAdMetrics(ads);
      const primary = groups[0];
      const totals = primary?.totals ?? emptyTotals();
      return {
        theme,
        label: THEME_LABEL[theme],
        adCount: ads.length,
        reviewCount: reviews.length,
        sourceIds: [
          ...ads.map((ad) => ad.sourceId),
          ...reviews.map((review) => review.sourceId),
        ],
        reviewExcerpts: reviews.slice(0, 3).map((review) => review.text),
        totals,
        metrics: primary?.metrics ?? calculateAdMetrics(totals),
      };
    })
    .filter((theme) => theme.adCount > 0 || theme.reviewCount > 0);
}

function metricAtLeastAsStrong(left: MetricResult, right: MetricResult): boolean | null {
  if (left.value == null || right.value == null) return null;
  return left.value >= right.value;
}

export function buildDashboardFindings(options: {
  ads: AdPerformance[];
  reviews: Review[];
}): { findings: DashboardFinding[]; themes: ThemePerformance[] } {
  const themes = summarizeThemes(options);
  const waterproof = themes.find((theme) => theme.theme === "waterproof");
  const style = themes.find((theme) => theme.theme === "style");
  const attribution = options.ads.some((ad) => ad.attribution === "demo")
    || options.reviews.some((review) => review.attribution === "demo")
    ? "Labelled demo / imported attribution — not live ad-account pull."
    : "Imported historical performance — not a live ad-account pull.";

  if (!waterproof || !style || waterproof.adCount === 0 || style.adCount === 0) {
    return {
      themes,
      findings: [
        {
          kind: "insufficient",
          title: "Not enough comparable ad history yet",
          observation:
            options.ads.length === 0
              ? "Import labelled reviews and historical ads to compare messaging themes. Shopify does not provide customer reviews through the core product API."
              : "Ads are present, but there are not yet two messaging themes with performance rows to compare (for example waterproof vs style-first).",
          supportingSourceIds: options.ads.map((ad) => ad.sourceId),
          observedMetrics: {},
          limitations: [attribution, ...SHARED_LIMITATIONS],
        },
      ],
    };
  }

  const ctrLead = metricAtLeastAsStrong(waterproof.metrics.ctr, style.metrics.ctr);
  const convLead = metricAtLeastAsStrong(
    waterproof.metrics.conversionRate,
    style.metrics.conversionRate,
  );
  const roasLead = metricAtLeastAsStrong(waterproof.metrics.roas, style.metrics.roas);
  const waterproofLeads =
    ctrLead === true && convLead === true && roasLead === true;

  const reviewNote =
    waterproof.reviewCount > style.reviewCount
      ? ` Customer reviews mention staying dry or rain protection (${waterproof.reviewCount}) more often than style (${style.reviewCount}).`
      : "";

  const comparison =
    `Waterproof / stay-dry ads: CTR ${formatRatio(waterproof.metrics.ctr)} (clicks/impressions), conversion ${formatRatio(waterproof.metrics.conversionRate)} (purchases/clicks), ROAS ${formatRoas(waterproof.metrics.roas)}. ` +
    `Style-first ads: CTR ${formatRatio(style.metrics.ctr)}, conversion ${formatRatio(style.metrics.conversionRate)} (purchases/clicks), ROAS ${formatRoas(style.metrics.roas)}.`;

  const working: DashboardFinding = {
    kind: "working",
    title: waterproofLeads
      ? "Waterproof messaging is outperforming style-first ads"
      : "Waterproof and style-first ads differ on some metrics",
    observation: waterproofLeads
      ? `${comparison} In this period, stay-dry messaging has the stronger CTR, conversion, and ROAS.${reviewNote}`
      : `${comparison}${reviewNote} Compare the metric columns rather than treating one theme as universally better.`,
    supportingSourceIds: [...waterproof.sourceIds, ...style.sourceIds],
    observedMetrics: {
      waterproofCtr: waterproof.metrics.ctr,
      waterproofConversionRate: waterproof.metrics.conversionRate,
      waterproofRoas: waterproof.metrics.roas,
      styleCtr: style.metrics.ctr,
      styleConversionRate: style.metrics.conversionRate,
      styleRoas: style.metrics.roas,
    },
    limitations: [attribution, ...SHARED_LIMITATIONS],
  };

  const weaker: DashboardFinding = {
    kind: "weaker",
    title: waterproofLeads
      ? "Style-first ads converted less well in this period"
      : "Style-first ads are not uniformly weaker",
    observation: waterproofLeads
      ? `Style-first ads used similar spend and impressions in this labelled period, but fewer clicks, purchases, and less attributed revenue than stay-dry ads. Treat this as a hypothesis for the next campaign, not a causal claim.`
      : `Style-first ads do not trail stay-dry ads on every metric in this period. Check CTR (clicks/impressions), conversion (purchases/clicks), and ROAS separately.`,
    supportingSourceIds: style.sourceIds,
    observedMetrics: {
      styleCtr: style.metrics.ctr,
      styleConversionRate: style.metrics.conversionRate,
      styleRoas: style.metrics.roas,
    },
    limitations: [attribution, ...SHARED_LIMITATIONS],
  };

  return { themes, findings: [working, weaker] };
}
