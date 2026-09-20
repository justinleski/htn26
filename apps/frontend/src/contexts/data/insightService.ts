import { compareMessagingThemes } from "./metrics";
import type { GenerationEvidence, Insight } from "./types";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The two messaging themes the top insight compares. Exported so the page
// can run the same pure comparison (for the chart) without re-guessing which
// themes this insight is about.
export const TOP_INSIGHT_THEMES = ["waterproof", "style"] as const;

/**
 * Analyzes product/review/ad evidence and returns the single top insight.
 *
 * TODO(real AI): Replace the body below with a server-side call to the
 * OpenAI Responses API (stage 1 of the AI workflow: "Analyze evidence").
 * Send `evidence` (or a retrieved/filtered subset from Elasticsearch) plus
 * the computed metrics, validate the response against the Insight schema,
 * and verify every sourceProductIds/sourceAdIds entry actually exists in
 * `evidence` before returning it.
 */
export async function generateTopInsight(
  evidence: GenerationEvidence,
): Promise<Insight> {
  await delay(900);

  const comparison = compareMessagingThemes(evidence.ads, ...TOP_INSIGHT_THEMES);
  const multiplier = comparison.multiplier;

  return {
    id: "insight-waterproof-vs-style",
    headline: `Waterproof-focused ads convert ${multiplier.toFixed(1)}x better than style-focused ads`,
    explanation:
      "Reviews repeatedly call out staying dry as the top reason customers buy, and ads leading with waterproofing consistently out-convert style-led creative for the same products. This is a strong pattern in your historical data, not a guarantee it will repeat.",
    supportingStat: `${(comparison.avgConversionA * 100).toFixed(1)}% avg conversion rate (waterproof messaging) vs ${(comparison.avgConversionB * 100).toFixed(1)}% (style messaging)`,
    sourceProductIds: comparison.productIds,
    sourceAdIds: comparison.adIds,
    limitations:
      "Based on a small sample of historical ads across a few products; correlation, not proven causation.",
  };
}
