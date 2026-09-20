import { useMemo } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { InsightCard } from "@/components/InsightCard";
import { PerformanceRankList } from "@/components/PerformanceRankList";
import { StoreSummaryBar } from "@/components/StoreSummaryBar";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";
import { useTopInsight } from "@/hooks/useTopInsight";
import { TOP_INSIGHT_THEMES } from "@/contexts/data/insightService";
import { compareMessagingThemes, rankAdPerformance } from "@/contexts/data/metrics";

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

  const comparison = useMemo(
    () => compareMessagingThemes(ads, ...TOP_INSIGHT_THEMES),
    [ads],
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
        <div className="paper h-40 animate-pulse rounded-xl opacity-50" />
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
            className="rounded-full border border-[var(--color-mark)]/40 px-4 py-2 text-sm font-medium text-[var(--color-mark)] transition-colors hover:bg-[var(--color-mark-tint)] disabled:opacity-60"
          >
            {action === "sync" ? "Syncing products..." : "Sync products"}
          </button>
          <button
            type="button"
            onClick={() => void importDemo()}
            disabled={busy}
            className="rounded-full border border-[var(--color-mark)]/40 px-4 py-2 text-sm font-medium text-[var(--color-mark)] transition-colors hover:bg-[var(--color-mark-tint)] disabled:opacity-60"
          >
            {action === "import-demo" ? "Loading labelled demo..." : "Load labelled demo"}
          </button>
        </div>

        {notice && (
          <p className="text-sm text-[var(--color-ink-on-dark)]/70">{notice}</p>
        )}

        {error && (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {loading ? (
          <div className="paper h-40 animate-pulse rounded-xl opacity-50" />
        ) : insight ? (
          <InsightCard insight={insight} comparison={comparison} />
        ) : (
          <p className="paper rounded-2xl px-5 py-6 text-sm text-[var(--color-ink-muted)]">
            No findings yet. Sync products or load the labelled demo to fill this dashboard.
          </p>
        )}

        <div>
          <h3 className="mb-3 text-sm font-medium tracking-wide text-[var(--color-ink-on-dark)]/60 uppercase">
            Best-performing products & ads
          </h3>
          {busy && rankedItems.length === 0 ? (
            <div className="paper h-32 animate-pulse rounded-xl opacity-50" />
          ) : (
            <PerformanceRankList items={rankedItems} />
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <motion.button
            onClick={handleGenerateCampaign}
            disabled={busy || !insight}
            whileTap={{ scale: 0.96 }}
            className="rounded-full bg-[var(--color-mark)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-mark-hover)] disabled:opacity-60"
          >
            Generate campaign
          </motion.button>
          <Link
            to="/creative-testing"
            className="rounded-full border border-[var(--color-mark)]/40 px-6 py-3 text-sm font-semibold text-[var(--color-mark)] transition-colors hover:bg-[var(--color-mark-tint)]"
          >
            View creative tests
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
