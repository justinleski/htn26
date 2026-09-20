import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";
import { useTopInsight } from "@/hooks/useTopInsight";
import { InsightCard } from "@/components/InsightCard";
import { DataState } from "@/components/DataState";

export function InsightsPage() {
  const { connected, loading: sessionLoading, storeName } = useStoreConnection();
  const { data, loading, error, notice, action, busy, sync, importDemo, reload } = useTopInsight();
  if (sessionLoading) return <DataState loading error={null} />;
  if (!connected) return <Navigate to="/" replace />;
  if (!data) return <DataState loading={loading} error={error} retry={reload} />;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col gap-6"
      >
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-mark)] sm:text-3xl">Evidence & insights</h1>
          <p className="mt-2 text-sm text-[var(--color-ink-on-dark)]/60">Patterns in your stored reviews and historical ads, with the evidence behind each observation.</p>
        </div>

        <section className="paper flex flex-col gap-5 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" aria-label="Store evidence summary">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">Connected store</p>
            <p className="font-display mt-1 break-all text-lg font-semibold text-[var(--color-mark)]">{storeName}</p>
          </div>
          <dl className="grid grid-cols-3 gap-5">
            {[['Products', data.products.length], ['Historical ads', data.ads.length], ['Reviews', data.reviews.length]].map(([label, count]) => (
              <div key={label}>
                <dt className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">{label}</dt>
                <dd className="font-display mt-1 text-2xl font-semibold">{count}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void sync()} disabled={busy} className="rounded-full border border-[var(--color-mark)]/40 px-4 py-2 text-sm font-medium text-[var(--color-mark)] transition-colors hover:bg-[var(--color-mark-tint)] disabled:opacity-60">
            {action === "sync" ? "Syncing products..." : "Sync products"}
          </button>
          <button type="button" onClick={() => void importDemo()} disabled={busy} className="rounded-full border border-[var(--color-mark)]/40 px-4 py-2 text-sm font-medium text-[var(--color-mark)] transition-colors hover:bg-[var(--color-mark-tint)] disabled:opacity-60">
            {action === "import-demo" ? "Loading labelled demo..." : "Load labelled demo"}
          </button>
        </div>
        {notice && <p role="status" className="text-sm text-[var(--color-ink-on-dark)]/70">{notice}</p>}
        {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-700"><p>{error}</p><button type="button" onClick={reload} disabled={busy} className="mt-2 underline disabled:opacity-60">Reload data</button></div>}

        {loading ? <div className="paper h-40 animate-pulse rounded-xl opacity-50" aria-label="Loading insights" /> : (
          data.findings.length > 0
            ? data.findings.map((finding, index) => <InsightCard key={`${finding.kind}-${index}`} insight={finding} />)
            : <p className="paper rounded-2xl px-5 py-6 text-sm text-[var(--color-ink-muted)]">No findings yet. Sync your products, then import reviews and historical ads from the dashboard or load the labelled demo.</p>
        )}

        {data.ads.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-ink-on-dark)]/60">Historical ad performance</h2>
            <div className="paper overflow-x-auto rounded-2xl">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--color-ink)]/10 text-xs uppercase tracking-wide text-[var(--color-ink-muted)]"><tr><th className="px-5 py-4">Product & source</th><th className="px-3 py-4">Channel</th><th className="px-3 py-4">CTR</th><th className="px-3 py-4">Conversion</th><th className="px-5 py-4">ROAS</th></tr></thead>
                <tbody>{data.ads.map((ad) => <tr key={ad.sourceId} className="border-b border-[var(--color-ink)]/10 last:border-0"><td className="px-5 py-4"><p className="font-medium">{ad.productTitle}</p><p className="mt-1 text-xs text-[var(--color-ink-muted)]">{ad.attribution} · {ad.currency}</p><p className="mt-1 break-all font-mono text-xs text-[var(--color-ink-muted)]">{ad.sourceId}</p></td><td className="px-3 py-4">{ad.channel}</td><td className="whitespace-nowrap px-3 py-4 font-mono-num">{ad.ctr}</td><td className="whitespace-nowrap px-3 py-4 font-mono-num">{ad.conversionRate}</td><td className="whitespace-nowrap px-5 py-4 font-mono-num">{ad.roas}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[var(--color-ink-on-dark)]/60">Imported results, with each source’s attribution preserved.</p>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <Link to="/campaign" className="rounded-full bg-[var(--color-mark)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-mark-hover)]">Create or reopen a campaign</Link>
          <Link to="/creative-testing" className="rounded-full border border-[var(--color-mark)]/40 px-6 py-3 text-sm font-semibold text-[var(--color-mark)] transition-colors hover:bg-[var(--color-mark-tint)]">View creative demo</Link>
        </div>
      </motion.div>
    </main>
  );
}
