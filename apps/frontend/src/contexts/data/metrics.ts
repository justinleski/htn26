import type {
  AdPerformance,
  MessagingTheme,
  PlatformStat,
  Product,
  RankedPerformanceItem,
} from "./types";

// An ad's platformBreakdown can genuinely diverge across channels, so there
// is no single "ad-level" ctr/conversionRate in the raw data. Callers that
// need one representative number (a table row, a theme comparison) use the
// ad's best-performing platform by conversion rate — simpler than a
// spend-weighted average and consistent with conversion rate being the
// north star metric everywhere else (creative testing winners included).

export function bestPlatformStat(ad: AdPerformance): PlatformStat {
  return ad.platformBreakdown.reduce((best, stat) =>
    stat.conversionRate > best.conversionRate ? stat : best,
  );
}

// ctaClicks / ctr recovers impressions since ctr is defined as clicks over
// impressions; conversions are conversionRate applied to those clicks.
export function impressionsFor(stat: Pick<PlatformStat, "ctr" | "ctaClicks">): number {
  return stat.ctr === 0 ? 0 : stat.ctaClicks / stat.ctr;
}

export function conversionsFor(stat: Pick<PlatformStat, "ctaClicks" | "conversionRate">): number {
  return stat.ctaClicks * stat.conversionRate;
}

export function costPerAcquisition(
  stat: Pick<PlatformStat, "ctaClicks" | "conversionRate" | "spend">,
): number {
  const conversions = conversionsFor(stat);
  return conversions === 0 ? 0 : stat.spend / conversions;
}

export function costPerImpression(
  stat: Pick<PlatformStat, "ctr" | "ctaClicks" | "spend">,
): number {
  const impressions = impressionsFor(stat);
  return impressions === 0 ? 0 : stat.spend / impressions;
}

export function rankAdPerformance(
  products: Product[],
  ads: AdPerformance[],
): RankedPerformanceItem[] {
  const productById = new Map(products.map((p) => [p.id, p]));

  return ads
    .map((ad) => {
      const best = bestPlatformStat(ad);
      return {
        id: ad.id,
        productId: ad.productId,
        name: productById.get(ad.productId)?.title ?? ad.name,
        theme: ad.theme,
        mediaType: ad.mediaType,
        bestPlatform: best.platform,
        ctr: best.ctr,
        conversionRate: best.conversionRate,
        platformBreakdown: ad.platformBreakdown,
      };
    })
    .sort((a, b) => b.conversionRate - a.conversionRate);
}

export interface ThemeComparison {
  themeA: MessagingTheme;
  themeB: MessagingTheme;
  avgConversionA: number;
  avgConversionB: number;
  avgCtrA: number;
  avgCtrB: number;
  multiplier: number;
  adIds: string[];
  productIds: string[];
}

export function compareMessagingThemes(
  ads: AdPerformance[],
  themeA: MessagingTheme,
  themeB: MessagingTheme,
): ThemeComparison {
  const groupA = ads.filter((ad) => ad.theme === themeA);
  const groupB = ads.filter((ad) => ad.theme === themeB);

  const avg = (group: AdPerformance[], fn: (ad: AdPerformance) => number) =>
    group.length === 0
      ? 0
      : group.reduce((sum, ad) => sum + fn(ad), 0) / group.length;

  const avgConversionA = avg(groupA, (ad) => bestPlatformStat(ad).conversionRate);
  const avgConversionB = avg(groupB, (ad) => bestPlatformStat(ad).conversionRate);

  return {
    themeA,
    themeB,
    avgConversionA,
    avgConversionB,
    avgCtrA: avg(groupA, (ad) => bestPlatformStat(ad).ctr),
    avgCtrB: avg(groupB, (ad) => bestPlatformStat(ad).ctr),
    multiplier: avgConversionB === 0 ? 0 : avgConversionA / avgConversionB,
    adIds: [...groupA, ...groupB].map((ad) => ad.id),
    productIds: [...new Set([...groupA, ...groupB].map((ad) => ad.productId))],
  };
}

const PLATFORM_SPREAD_THRESHOLD = 2;

export interface PlatformSpreadFlag {
  best: PlatformStat;
  worst: PlatformStat;
  ratio: number;
  message: string;
}

/**
 * Flags a meaningful conversion-rate gap between an ad's best and worst
 * platform (default threshold: 2x). Plain comparison, no AI involved.
 */
export function getPlatformSpreadFlag(
  ad: Pick<AdPerformance, "mediaType" | "platformBreakdown">,
): PlatformSpreadFlag | null {
  if (ad.platformBreakdown.length < 2) return null;

  const best = ad.platformBreakdown.reduce((a, b) =>
    b.conversionRate > a.conversionRate ? b : a,
  );
  const worst = ad.platformBreakdown.reduce((a, b) =>
    b.conversionRate < a.conversionRate ? b : a,
  );

  if (worst.conversionRate === 0) {
    return best.conversionRate === 0
      ? null
      : {
          best,
          worst,
          ratio: Infinity,
          message: `This ${ad.mediaType} converts on ${best.platform} but hasn't converted at all on ${worst.platform} — consider reallocating spend.`,
        };
  }

  const ratio = best.conversionRate / worst.conversionRate;
  if (ratio < PLATFORM_SPREAD_THRESHOLD) return null;

  return {
    best,
    worst,
    ratio,
    message: `This ${ad.mediaType} performs ${ratio.toFixed(1)}x better on ${best.platform} than ${worst.platform} — consider reallocating spend.`,
  };
}

const BROAD_APPEAL_MIN_PLATFORMS = 2;
const BROAD_APPEAL_MAX_SPREAD_RATIO = 1.5;

/**
 * Ads that ran on 2+ platforms and converted consistently well on all of
 * them — the opposite signal from getPlatformSpreadFlag. Plain comparison,
 * no AI involved; the AI layer only writes the sentence describing it.
 */
export function getBroadAppealAds(ads: AdPerformance[]): AdPerformance[] {
  return ads.filter((ad) => {
    if (ad.platformBreakdown.length < BROAD_APPEAL_MIN_PLATFORMS) return false;
    const rates = ad.platformBreakdown.map((stat) => stat.conversionRate);
    const max = Math.max(...rates);
    const min = Math.min(...rates);
    if (min === 0) return false;
    return max / min < BROAD_APPEAL_MAX_SPREAD_RATIO;
  });
}
