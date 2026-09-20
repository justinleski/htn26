import { useState } from "react";
import { getPlatformSpreadFlag } from "@/contexts/data/metrics";
import type { RankedPerformanceItem } from "@/contexts/data/types";

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString()}`;
}

<<<<<<< HEAD
=======
// ADDED: small chevron icon, rotated via a wrapper span based on expand state.
// Kept as raw SVG (no new dependency) since I don't know if you have an icon
// library installed yet — swap for lucide-react's ChevronDown if you do.
function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
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

>>>>>>> origin/main
export function PerformanceRankList({ items }: { items: RankedPerformanceItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
<<<<<<< HEAD
      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-4 border-b border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium tracking-wide text-[var(--color-muted)] uppercase sm:px-5">
=======
      {/* UPDATED line 18: grid-cols-[auto_1fr_auto_auto] -> added a 5th auto column for the chevron */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 border-b border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium tracking-wide text-[var(--color-muted)] uppercase sm:px-5">
>>>>>>> origin/main
        <span>#</span>
        <span>Product / campaign</span>
        <span className="text-right">CTR</span>
        <span className="text-right">Conv. rate</span>
<<<<<<< HEAD
=======
        <span aria-hidden="true" /> {/* ADDED: empty header cell so the chevron column lines up */}
>>>>>>> origin/main
      </div>
      <ul>
        {items.map((item, index) => {
          const isExpanded = expandedId === item.id;
          const flag = getPlatformSpreadFlag(item);

          return (
<<<<<<< HEAD
            <li key={item.id} className="border-b border-white/5 last:border-b-0">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-x-4 px-4 py-3 text-left text-sm hover:bg-white/[0.03] sm:px-5"
=======
            <li
              key={item.id}
              // UPDATED line 30: added conditional glow + border tint + transition when this row is expanded
              className={`border-b border-white/5 last:border-b-0 transition-shadow duration-300 ${
                isExpanded
                  ? "shadow-[0_0_28px_-6px_var(--color-accent)] border-[var(--color-accent)]/30"
                  : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                // UPDATED line 34: grid-cols-[auto_1fr_auto_auto] -> matches the new 5-column header
                className="grid w-full grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-4 px-4 py-3 text-left text-sm hover:bg-white/[0.03] sm:px-5"
>>>>>>> origin/main
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
<<<<<<< HEAD
=======
                {/* ADDED: chevron cell — rotates 180deg and tints accent color when expanded */}
                <span
                  className={`flex justify-end transition-transform duration-200 ${
                    isExpanded ? "rotate-180 text-[var(--color-accent)]" : "text-[var(--color-muted)]"
                  }`}
                >
                  <ChevronIcon />
                </span>
>>>>>>> origin/main
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
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main
