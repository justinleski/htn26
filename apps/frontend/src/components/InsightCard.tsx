import { motion } from "framer-motion";
import { ConversionComparisonBars } from "@/components/ConversionComparisonBars";
import type { ThemeComparison } from "@/contexts/data/metrics";
import type { Insight } from "@/contexts/data/types";

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function InsightCard({
  insight,
  comparison,
}: {
  insight: Insight;
  comparison: ThemeComparison;
}) {
  const aWins = comparison.avgConversionA >= comparison.avgConversionB;
  const bars = [
    {
      label: capitalize(comparison.themeA),
      value: comparison.avgConversionA,
      isWinner: aWins,
    },
    {
      label: capitalize(comparison.themeB),
      value: comparison.avgConversionB,
      isWinner: !aWins,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="paper rounded-2xl p-6 sm:p-8"
    >
      <p className="mb-2 text-xs font-medium tracking-wide text-[var(--color-ink-muted)] uppercase">
        Top insight
      </p>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-display text-5xl leading-none font-semibold">
          {comparison.multiplier.toFixed(1)}×
        </p>
        <p className="text-sm text-[var(--color-ink-muted)]">
          higher conversion rate — {bars[0].label} vs {bars[1].label} messaging
        </p>
      </div>

      <div className="mt-6 max-w-md">
        <ConversionComparisonBars bars={bars} />
      </div>

      <p className="mt-6 max-w-2xl text-sm text-[var(--color-ink-muted)]">{insight.explanation}</p>
      <p className="mt-4 text-xs text-[var(--color-ink-muted)]">{insight.limitations}</p>
    </motion.div>
  );
}
