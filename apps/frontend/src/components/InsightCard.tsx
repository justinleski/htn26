import { motion } from "framer-motion";
import { ConversionComparisonBars } from "@/components/ConversionComparisonBars";
import type { Dashboard } from "@/contexts/data/api";

type Finding = Dashboard["findings"][number];

function conversionRate(finding: Finding, key: string): number | null {
  const value = finding.observedMetrics?.[key]?.value;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function InsightCard({
  insight,
}: {
  insight: Finding;
}) {
  const waterproof = conversionRate(insight, "waterproofConversionRate");
  const style = conversionRate(insight, "styleConversionRate");
  const comparable = waterproof !== null && style !== null;
  const bars = comparable ? [
    {
      label: "Waterproof / stay-dry",
      value: waterproof,
      isWinner: waterproof > style,
    },
    {
      label: "Style-first",
      value: style,
      isWinner: style > waterproof,
    },
  ] : null;
  const multiplier = comparable && Math.min(waterproof, style) > 0 && waterproof !== style
    ? Math.max(waterproof, style) / Math.min(waterproof, style)
    : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="paper rounded-2xl p-6 sm:p-8"
    >
      <p className="mb-2 text-xs font-medium tracking-wide text-[var(--color-ink-muted)] uppercase">
        {insight.kind === "insufficient" ? "Evidence needed" : "Historical observation"}
      </p>
      <h2 className="font-display text-xl font-semibold sm:text-2xl">{insight.title}</h2>

      {multiplier !== null && (
        <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="font-display text-5xl leading-none font-semibold">{multiplier.toFixed(1)}×</p>
          <p className="text-sm text-[var(--color-ink-muted)]">
            the observed conversion rate — {waterproof! > style! ? "waterproof / stay-dry vs style-first" : "style-first vs waterproof / stay-dry"}
          </p>
        </div>
      )}

      {bars && (
        <div className="mt-6 max-w-lg">
          <ConversionComparisonBars bars={bars} />
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">Conversion = purchases / clicks, within this product and reporting period.</p>
        </div>
      )}

      <p className="mt-6 text-sm leading-relaxed text-[var(--color-ink-muted)]">{insight.observation}</p>
      <ul className="mt-4 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[var(--color-ink-muted)]">
        {insight.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
      </ul>
      <details className="mt-5 border-t border-[var(--color-ink)]/10 pt-4 text-xs text-[var(--color-ink-muted)]">
        <summary className="cursor-pointer font-medium">Supporting sources ({insight.supportingSourceIds.length})</summary>
        {insight.supportingSourceIds.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {insight.supportingSourceIds.map((sourceId) => <li key={sourceId} className="break-all rounded-md bg-[var(--color-ink)]/5 px-2 py-1 font-mono">{sourceId}</li>)}
          </ul>
        ) : <p className="mt-3">No supporting source rows yet.</p>}
      </details>
    </motion.section>
  );
}
