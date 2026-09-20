interface StoreSummaryBarProps {
  storeName: string;
  productCount: number;
  adCount: number;
  avgCtr: number;
  avgConversionRate: number;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-[var(--color-ink-muted)] uppercase">{label}</p>
      <p className="font-display mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function StoreSummaryBar({
  storeName,
  productCount,
  adCount,
  avgCtr,
  avgConversionRate,
}: StoreSummaryBarProps) {
  return (
    <div className="paper flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <p className="text-xs tracking-wide text-[var(--color-ink-muted)] uppercase">
          Connected store
        </p>
        <p className="font-display mt-1 text-lg font-semibold">{storeName}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
        <Stat label="Products" value={String(productCount)} />
        <Stat label="Active ads" value={String(adCount)} />
        <Stat label="Avg CTR" value={`${(avgCtr * 100).toFixed(1)}%`} />
        <Stat label="Avg conv." value={`${(avgConversionRate * 100).toFixed(1)}%`} />
      </div>
    </div>
  );
}
