import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PlatformTag } from "@/components/PlatformTag";
import { getPlatformSpreadFlag } from "@/contexts/data/metrics";
import type { RankedPerformanceItem } from "@/contexts/data/types";

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString()}`;
}

function ChevronIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function PerformanceRankList({ items }: { items: RankedPerformanceItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="paper overflow-hidden rounded-2xl">
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 border-b border-[var(--color-ink)]/10 bg-[var(--color-paper-dim)] px-4 py-2.5 text-xs font-medium tracking-wide text-[var(--color-ink-muted)] uppercase sm:px-5">
        <span>#</span>
        <span>Product / campaign</span>
        <span className="text-right">CTR</span>
        <span className="text-right">Conv. rate</span>
        <span aria-hidden="true" />
      </div>
      <ul>
        {items.map((item, index) => {
          const isExpanded = expandedId === item.id;
          const flag = getPlatformSpreadFlag(item);

          return (
            <li key={item.id} className="relative border-b border-[var(--color-ink)]/10 last:border-b-0">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                aria-expanded={isExpanded}
                className="grid w-full grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-4 px-4 py-3 text-left text-sm hover:bg-[var(--color-ink)]/[0.03]"
              >
                <span className="text-[var(--color-ink-muted)]">{index + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="text-xs text-[var(--color-ink-muted)] capitalize">
                    {item.theme} · best on <PlatformTag platform={item.bestPlatform} />
                    {item.platformBreakdown.length > 1 &&
                      ` (+${item.platformBreakdown.length - 1} more)`}
                  </span>
                </span>
                <span className="font-mono-num text-right">{formatPct(item.ctr)}</span>
                <span className="font-mono-num text-right font-medium">
                  {formatPct(item.conversionRate)}
                </span>
                <span className="flex items-center justify-end gap-1 text-xs text-[var(--color-ink-muted)]">
                  <span className="hidden sm:inline">{isExpanded ? "Hide" : "Details"}</span>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex"
                  >
                    <ChevronIcon />
                  </motion.span>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="details"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-[var(--color-ink)]/10 bg-[var(--color-paper-dim)] px-4 py-3 sm:px-5">
                      {flag && (
                        <p className="mb-3 rounded-xl border border-[var(--color-flag)]/40 bg-[var(--color-flag)]/10 px-3 py-2 text-xs text-[var(--color-flag)]">
                          ⚠ {flag.message}
                        </p>
                      )}
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 pb-1.5 text-[11px] font-medium tracking-wide text-[var(--color-ink-muted)] uppercase">
                        <span>Platform</span>
                        <span className="text-right">CTR</span>
                        <span className="text-right">Conv. rate</span>
                        <span className="text-right">Spend</span>
                      </div>
                      <ul className="flex flex-col gap-1.5">
                        {item.platformBreakdown.map((stat) => {
                          const isBest = stat.platform === item.bestPlatform;
                          return (
                            <li
                              key={stat.platform}
                              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 py-1 text-sm"
                            >
                              <PlatformTag
                                platform={stat.platform}
                                className={isBest ? "font-medium" : ""}
                              />
                              <span className="font-mono-num text-right">
                                {formatPct(stat.ctr)}
                              </span>
                              <span className="font-mono-num text-right">
                                {formatPct(stat.conversionRate)}
                              </span>
                              <span className="font-mono-num text-right text-[var(--color-ink-muted)]">
                                {formatCurrency(stat.spend)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
