import type { CreativeDimension, Variant } from "./types";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describeAttribute(dimension: CreativeDimension, winner: Variant): string {
  switch (dimension) {
    case "caption":
      return `the "${winner.captionTheme}" caption theme`;
    case "media":
      return `the ${winner.mediaType} creative`;
    case "hashtags":
      return `the "${winner.hashtags[0]}" hashtag set`;
  }
}

/**
 * Explains why a round's winner won, in one sentence referencing its
 * specific attribute (theme/mediaType/hashtag set) vs. the other variants.
 *
 * TODO(real AI): Replace the body below with a server-side call to the
 * OpenAI/Gemini API. Send `variants` and `winnerId` (plus `variedDimension`
 * for phrasing), validate the response is a single sentence, and confirm it
 * doesn't reference any attribute the winning variant doesn't actually have.
 */
export async function explainRoundWinner(
  variants: Variant[],
  winnerId: string,
  variedDimension: CreativeDimension,
): Promise<string> {
  await delay(750);

  const winner = variants.find((v) => v.id === winnerId);
  if (!winner) {
    return "Not enough data to explain this round's winner yet.";
  }

  const others = variants.filter((v) => v.id !== winnerId);
  const avgOthersConversion =
    others.length === 0
      ? 0
      : others.reduce((sum, v) => sum + v.conversionRate, 0) / others.length;
  const multiplier =
    avgOthersConversion === 0 ? 0 : winner.conversionRate / avgOthersConversion;

  const attribute = describeAttribute(variedDimension, winner);
  const attributeCapitalized = attribute[0].toUpperCase() + attribute.slice(1);

  return `${attributeCapitalized} converted at ${(winner.conversionRate * 100).toFixed(1)}%, roughly ${multiplier.toFixed(1)}x the other variants tested this round — clear enough to lock in before moving on.`;
}
