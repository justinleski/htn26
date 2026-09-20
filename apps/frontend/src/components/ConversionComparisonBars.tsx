interface ComparisonBar {
  label: string;
  value: number; // 0-1
  isWinner: boolean;
}

// "Emphasis" form: one bar is the point, the other is context. Both carry a
// direct numeric label so identity never depends on color alone.
export function ConversionComparisonBars({ bars }: { bars: ComparisonBar[] }) {
  const max = Math.max(...bars.map((b) => b.value)) * 1.15 || 1;

  return (
    <div className="flex flex-col gap-3">
      {bars.map((bar) => (
        <div key={bar.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs text-[var(--color-ink-muted)]">{bar.label}</span>
          <div className="relative h-5 flex-1 rounded-full bg-[var(--color-ink)]/8">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(bar.value / max) * 100}%`,
                backgroundColor: bar.isWinner ? "var(--color-mark)" : "var(--color-ink-muted)",
              }}
            />
          </div>
          <span className="font-mono-num w-14 shrink-0 text-right text-sm font-medium">
            {(bar.value * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}
