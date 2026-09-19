import { useState } from "react";
import { getPlatformSpreadFlag } from "@/contexts/data/metrics";
import type { RankedPerformanceItem } from "@/contexts/data/types";

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString()}`;
}

export function PerformanceRankList({ items }: { items: RankedPerformanceItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-4 border-b border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium tracking-wide text-[var(--color-muted)] uppercase sm:px-5">
        <span>#</span>
        <span>Product / campaign</span>
        <span className="text-right">CTR</span>
        <span className="text-right">Conv. rate</span>
      </div>
      <ul>
        {items.map((item, index) => {
          const isExpanded = expandedId === item.id;
          const flag = getPlatformSpreadFlag(item);

          return (
            <li key={item.id} className="border-b border-white/5 last:border-b-0">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-x-4 px-4 py-3 text-left text-sm hover:bg-white/[0.03] sm:px-5"
              >
                <span className="text-[var(--color-muted)]">{index + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="text-xs text-[var(--color-muted)] capitalize">
                    {item.theme} · best on {item.bestPlatform}
                    {item.platformBreakdown.length > 1 &&
                      ` (+${item.platformBreakdown.length - 1} more)`}
                  </span>
                </span>
                <span className="text-right tabular-nums">{formatPct(item.ctr)}</span>
                <span className="text-right tabular-nums font-medium text-[var(--color-accent)]">
                  {formatPct(item.conversionRate)}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-white/5 bg-black/20 px-4 py-3 sm:px-5">
                  {flag && (
                    <p className="mb-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                      ⚠ {flag.message}
                    </p>
                  )}
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 pb-1.5 text-[11px] font-medium tracking-wide text-[var(--color-muted)] uppercase">
                    <span>Platform</span>
                    <span className="text-right">CTR</span>
                    <span className="text-right">Conv. rate</span>
                    <span className="text-right">Spend</span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {item.platformBreakdown.map((stat) => (
                      <li
                        key={stat.platform}
                        className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 text-sm"
                      >
                        <span
                          className={
                            stat.platform === item.bestPlatform
                              ? "font-medium text-[var(--color-accent)]"
                              : ""
                          }
                        >
                          {stat.platform}
                        </span>
                        <span className="text-right tabular-nums">{formatPct(stat.ctr)}</span>
                        <span className="text-right tabular-nums">
                          {formatPct(stat.conversionRate)}
                        </span>
                        <span className="text-right tabular-nums text-[var(--color-muted)]">
                          {formatCurrency(stat.spend)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
