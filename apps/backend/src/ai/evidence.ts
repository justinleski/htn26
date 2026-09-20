import { calculateAdMetrics } from "../metrics/index.js";
import type { AdPerformance, Product, Review } from "../schemas.js";

export type EvidenceRecord = Product | Review | AdPerformance;

export function isProduct(record: EvidenceRecord): record is Product {
  return "shopifyId" in record;
}

export function isReview(record: EvidenceRecord): record is Review {
  return "rating" in record && "text" in record;
}

export function isAdPerformance(record: EvidenceRecord): record is AdPerformance {
  return "messaging" in record && "impressions" in record;
}

export function knownSourceIds(records: EvidenceRecord[]): Set<string> {
  const ids = new Set<string>();
  for (const record of records) {
    ids.add(record.id);
    if (isReview(record) || isAdPerformance(record)) ids.add(record.sourceId);
  }
  return ids;
}

export function attachAdMetrics(ads: AdPerformance[]) {
  return ads.map((ad) => ({
    id: ad.id,
    sourceId: ad.sourceId,
    campaignId: ad.campaignId,
    messaging: ad.messaging,
    channel: ad.channel,
    impressions: ad.impressions,
    clicks: ad.clicks,
    purchases: ad.purchases,
    spend: ad.spend,
    attributedRevenue: ad.attributedRevenue,
    currency: ad.currency,
    periodStart: ad.periodStart,
    periodEnd: ad.periodEnd,
    metrics: calculateAdMetrics(ad),
  }));
}

export function splitEvidence(records: EvidenceRecord[]): {
  products: Product[];
  reviews: Review[];
  ads: AdPerformance[];
} {
  return {
    products: records.filter(isProduct),
    reviews: records.filter(isReview),
    ads: records.filter(isAdPerformance),
  };
}
