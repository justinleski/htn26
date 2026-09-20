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
          <motion.button
            onClick={handleGenerateCampaign}
            disabled={loading}
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
