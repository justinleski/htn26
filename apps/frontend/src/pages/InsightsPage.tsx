import { useMemo } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { InsightCard } from "@/components/InsightCard";
import { PerformanceRankList } from "@/components/PerformanceRankList";
import { StoreSummaryBar } from "@/components/StoreSummaryBar";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";
import { useTopInsight } from "@/hooks/useTopInsight";
import { rankAdPerformance } from "@/contexts/data/metrics";

export function InsightsPage() {
  const { connected, ready, storeName } = useStoreConnection();
  const navigate = useNavigate();
  const {
    insight,
    products,
    ads,
    loading,
    error,
    notice,
    action,
    busy,
    sync,
    importDemo,
  } = useTopInsight({ autoFillEmpty: true });

  const rankedItems = useMemo(
    () => rankAdPerformance(products, ads),
    [ads, products],
  );

  const summary = useMemo(() => {
    const avg = (fn: (item: (typeof rankedItems)[number]) => number) =>
      rankedItems.length === 0
        ? 0
        : rankedItems.reduce((sum, item) => sum + fn(item), 0) / rankedItems.length;

    return {
      productCount: products.length,
      adCount: ads.length,
      avgCtr: avg((item) => item.ctr),
      avgConversionRate: avg((item) => item.conversionRate),
    };
  }, [ads.length, products.length, rankedItems]);

  if (!ready) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
        <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      </main>
    );
  }

  if (!connected) {
    return <Navigate to="/" replace />;
  }

  function handleGenerateCampaign() {
    const topProductId = rankedItems[0]?.productId ?? products[0]?.id;
    navigate("/campaign", { state: { productId: topProductId } });
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col gap-6"
      >
        <StoreSummaryBar storeName={storeName} {...summary} />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void sync()}
            disabled={busy}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/5 disabled:opacity-60"
          >
            {action === "sync" ? "Syncing products..." : "Sync products"}
          </button>
          <button
            type="button"
            onClick={() => void importDemo()}
            disabled={busy}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/5 disabled:opacity-60"
          >
            {action === "import-demo" ? "Loading labelled demo..." : "Load labelled demo"}
          </button>
        </div>

        {notice && (
          <p className="text-sm text-[var(--color-muted)]">{notice}</p>
        )}

        {error && (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
        ) : insight ? (
          <InsightCard insight={insight} />
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-6 text-sm text-[var(--color-muted)]">
            No findings yet. Sync products or load the labelled demo to fill this dashboard.
          </p>
        )}

        <div>
          <h3 className="mb-3 text-sm font-medium tracking-wide text-[var(--color-muted)] uppercase">
            Best-performing products & ads
          </h3>
          {busy && rankedItems.length === 0 ? (
            <div className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ) : (
            <PerformanceRankList items={rankedItems} />
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGenerateCampaign}
            disabled={busy || !insight}
            className="rounded-lg bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-black transition-opacity disabled:opacity-60"
          >
            Generate campaign from this insight
          </button>
          <Link
            to="/creative-testing"
            className="rounded-lg border border-white/15 px-5 py-3 text-sm font-medium hover:bg-white/5"
          >
            See how we found this: creative testing funnel →
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
