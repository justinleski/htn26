import { useMemo } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { InsightCard } from "@/components/InsightCard";
import { PerformanceRankList } from "@/components/PerformanceRankList";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";
import { useTopInsight } from "@/hooks/useTopInsight";
import { adPerformance, products } from "@/contexts/data/mockData";
import { rankAdPerformance } from "@/contexts/data/metrics";

export function InsightsPage() {
  const { connected } = useStoreConnection();
  const navigate = useNavigate();
  const { insight, loading } = useTopInsight();

  const rankedItems = useMemo(
    () => rankAdPerformance(products, adPerformance),
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
          <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
        ) : (
          <InsightCard insight={insight} />
        )}

        <div>
          <h3 className="mb-3 text-sm font-medium tracking-wide text-[var(--color-muted)] uppercase">
            Best-performing products & ads
          </h3>
          <PerformanceRankList items={rankedItems} />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGenerateCampaign}
            disabled={loading}
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
