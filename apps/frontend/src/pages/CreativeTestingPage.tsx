import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreativeRoundColumn } from "@/components/CreativeRoundColumn";
import { OptimizedAdCard } from "@/components/OptimizedAdCard";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";
import { useCreativeExperiment } from "@/hooks/useCreativeExperiment";
import { getMockCreativeExperiment } from "@/contexts/data/creativeTestData";
import { products } from "@/contexts/data/mockData";

const experiment = getMockCreativeExperiment();

function FunnelArrow() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-24 shrink-0 text-[var(--color-ink-on-dark)]/70"
      aria-hidden="true"
    >
      <line x1="3" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function CreativeTestingPage() {
  const { connected } = useStoreConnection();
  const navigate = useNavigate();
  const { rounds, finalAd, selectVariant } = useCreativeExperiment(experiment);

  if (!connected) {
    return <Navigate to="/" replace />;
  }

  const product = products.find((p) => p.id === experiment.productId);
  const selectionKey = rounds.map((r) => r.selectedId).join("|");

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-[var(--color-ink-on-dark)]/60 hover:text-[var(--color-ink-on-dark)]"
        >
          ← Back
        </button>
        <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Creative testing{product ? ` — ${product.title}` : ""}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-ink-on-dark)]/60">
          Each round isolates one creative variable and locks in the winner by
          conversion rate before testing the next. Click a row to see the full
          post and pick what feeds the optimized ad. Click a column header to
          re-sort a round's table.
        </p>

        <div className="mt-6 flex items-start gap-4 overflow-x-auto pb-4">
          {rounds.map((round, index) => (
            <div key={round.round} className="flex items-start gap-4">
              {index > 0 && <FunnelArrow />}
              <CreativeRoundColumn
                round={round}
                onSelect={(variantId) => selectVariant(round.round, variantId)}
              />
            </div>
          ))}

          {finalAd && (
            <>
              <FunnelArrow />
              <OptimizedAdCard key={selectionKey} finalAd={finalAd} />
            </>
          )}
        </div>
      </motion.div>
    </main>
  );
}
