import type { Variant } from "./types";

// North star metric is conversion rate, not CTR — a variant with high CTR but
// low conversion should not win. Pure and synchronous so it can run the
// moment a round's variant data exists, no AI involved. Swapping this for a
// real statistical-significance test later doesn't require touching callers.
export function pickRoundWinner(variants: Variant[]): Variant | null {
  if (variants.length === 0) return null;

  return variants.reduce((best, variant) =>
    variant.conversionRate > best.conversionRate ? variant : best,
  );
}
