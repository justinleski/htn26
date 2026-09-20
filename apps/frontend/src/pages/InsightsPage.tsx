import { useMemo } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { InsightCard } from "@/components/InsightCard";
import { PerformanceRankList } from "@/components/PerformanceRankList";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";
import { useTopInsight } from "@/hooks/useTopInsight";
import { TOP_INSIGHT_THEMES } from "@/contexts/data/insightService";
import { adPerformance, products } from "@/contexts/data/mockData";
import { compareMessagingThemes, rankAdPerformance } from "@/contexts/data/metrics";

export function InsightsPage() {
  const { connected } = useStoreConnection();
  const navigate = useNavigate();
  const { insight, loading } = useTopInsight();

  const rankedItems = useMemo(
    () => rankAdPerformance(products, adPerformance),
    [],
  );

  const comparison = useMemo(
    () => compareMessagingThemes(adPerformance, ...TOP_INSIGHT_THEMES),
    [],
  );

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
        {loading || !insight ? (
          <div className="paper h-40 animate-pulse rounded-xl opacity-50" />
        ) : (
          <InsightCard insight={insight} comparison={comparison} />
        )}

        <div>
          <h3 className="mb-3 text-sm font-medium tracking-wide text-[var(--color-ink-on-dark)]/60 uppercase">
            Best-performing products & ads
          </h3>
          <PerformanceRankList items={rankedItems} />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGenerateCampaign}
            disabled={loading}
            className="rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-semibold text-[var(--color-paper)] transition-opacity disabled:opacity-60"
          >
            Generate campaign
          </button>
          <Link
            to="/creative-testing"
            className="rounded-full border border-[var(--color-ink)]/25 px-6 py-3 text-sm font-medium text-[var(--color-ink)]/80 hover:border-[var(--color-ink)]/50 hover:text-[var(--color-ink)]"
          >
            View creative tests
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
