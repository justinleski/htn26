import type { AdPerformance } from "../schemas.js";

export type MetricUnavailableReason = "missing-value" | "zero-denominator";

export interface MetricResult {
  value: number | null;
  reason?: MetricUnavailableReason;
}

export interface AdMetrics {
  ctr: MetricResult;
  conversionRate: MetricResult;
  roas: MetricResult;
}

export function ratio(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): MetricResult {
  if (numerator == null || denominator == null) {
    return { value: null, reason: "missing-value" };
  }
  if (denominator === 0) {
    return { value: null, reason: "zero-denominator" };
  }
  return { value: numerator / denominator };
}

export function calculateAdMetrics(
  ad: Pick<AdPerformance, "impressions" | "clicks" | "purchases" | "spend" | "attributedRevenue">,
): AdMetrics {
  return {
    ctr: ratio(ad.clicks, ad.impressions),
    conversionRate: ratio(ad.purchases, ad.clicks),
    roas: ratio(ad.attributedRevenue, ad.spend),
  };
}

export interface MetricGroup {
  currency: string;
  periodStart: string;
  periodEnd: string;
  ads: AdPerformance[];
  totals: {
    impressions: number;
    clicks: number;
    purchases: number;
    spend: number;
    attributedRevenue: number;
  };
  metrics: AdMetrics;
}

export function groupAdMetrics(ads: AdPerformance[]): MetricGroup[] {
  const groups = new Map<string, AdPerformance[]>();
  for (const ad of ads) {
    const key = `${ad.currency}:${ad.periodStart}:${ad.periodEnd}`;
    const group = groups.get(key) ?? [];
    group.push(ad);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => {
    const totals = group.reduce(
      (sum, ad) => ({
        impressions: sum.impressions + ad.impressions,
        clicks: sum.clicks + ad.clicks,
        purchases: sum.purchases + ad.purchases,
        spend: sum.spend + ad.spend,
        attributedRevenue: sum.attributedRevenue + ad.attributedRevenue,
      }),
      { impressions: 0, clicks: 0, purchases: 0, spend: 0, attributedRevenue: 0 },
    );

    return {
      currency: group[0]!.currency,
      periodStart: group[0]!.periodStart,
      periodEnd: group[0]!.periodEnd,
      ads: group,
      totals,
      metrics: calculateAdMetrics(totals),
    };
  });
}
