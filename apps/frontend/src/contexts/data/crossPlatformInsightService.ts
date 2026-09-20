import { getBroadAppealAds } from "./metrics";
import type { AdPerformance, CrossPlatformFinding, Product } from "./types";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Finds ads that resonated broadly — converting well on every platform they
 * ran on, not just spiking on one — and writes a one-sentence summary of
 * each. getBroadAppealAds() (plain comparison) already isolated which ads
 * qualify; this only writes the sentence.
 *
 * TODO(real AI): Replace the body below with a server-side call to the
 * OpenAI/Gemini API. Send the qualifying ads (name, theme, mediaType,
 * platformBreakdown) and validate the response references only platforms
 * actually present in that ad's breakdown.
 */
export async function generateCrossPlatformFindings(
  ads: AdPerformance[],
  products: Product[],
): Promise<CrossPlatformFinding[]> {
  await delay(900);

  const productById = new Map(products.map((p) => [p.id, p]));
  const broadAppealAds = getBroadAppealAds(ads);

  return broadAppealAds.map((ad) => {
    const platforms = ad.platformBreakdown.map((stat) => stat.platform);
    const platformList = platforms.join(" and ");
    const productName = productById.get(ad.productId)?.title ?? ad.name;

    return {
      id: `broad-appeal-${ad.id}`,
      adId: ad.id,
      kind: "broad-appeal",
      headline: `"${ad.name}" is catching interest everywhere it runs`,
      explanation: `This ${ad.mediaType} for ${productName} converts consistently well on every platform it ran on (${platformList}) — not a one-channel spike. Worth scaling budget across all of them rather than picking a single platform.`,
      platforms,
    };
  });
}
