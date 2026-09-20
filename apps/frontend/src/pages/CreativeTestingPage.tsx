import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreativeRoundColumn } from "@/components/CreativeRoundColumn";
import { OptimizedAdCard } from "@/components/OptimizedAdCard";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";
import { useCreativeExperiment } from "@/hooks/useCreativeExperiment";
import { getMockCreativeExperiment } from "@/contexts/data/creativeTestData";
import { products } from "@/contexts/data/mockData";

const experiment = getMockCreativeExperiment();

export function CreativeTestingPage() {
  const { connected } = useStoreConnection();
  const navigate = useNavigate();
<<<<<<< HEAD
  const { rounds, finalAd } = useCreativeExperiment(experiment);
=======
  const { rounds, finalAd, selectVariant } = useCreativeExperiment(experiment);
>>>>>>> origin/main

  if (!connected) {
    return <Navigate to="/" replace />;
  }

  const product = products.find((p) => p.id === experiment.productId);
<<<<<<< HEAD
=======
  const selectionKey = rounds.map((r) => r.selectedId).join("|");
>>>>>>> origin/main

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <button
<<<<<<< HEAD
          onClick={() => navigate("/insights")}
          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          ← Back to insights
=======
          onClick={() => navigate(-1)}
          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          ← Back
>>>>>>> origin/main
        </button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Creative testing{product ? ` — ${product.title}` : ""}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted)]">
          Each round isolates one creative variable and locks in the winner by
          conversion rate before testing the next. High CTR alone doesn't win —
<<<<<<< HEAD
          conversion does.
=======
          conversion does. Click any card to swap it into the optimized ad.
>>>>>>> origin/main
        </p>

        <div className="mt-8 flex items-start gap-4 overflow-x-auto pb-4">
          {rounds.map((round, index) => (
            <div key={round.round} className="flex items-start gap-4">
              {index > 0 && (
                <div className="mt-24 text-xl text-[var(--color-muted)]">→</div>
              )}
<<<<<<< HEAD
              <CreativeRoundColumn round={round} />
=======
              <CreativeRoundColumn
                round={round}
                onSelect={(variantId) => selectVariant(round.round, variantId)}
              />
>>>>>>> origin/main
            </div>
          ))}

          {finalAd && (
            <>
              <div className="mt-24 text-xl text-[var(--color-muted)]">→</div>
<<<<<<< HEAD
              <OptimizedAdCard finalAd={finalAd} />
=======
              <OptimizedAdCard key={selectionKey} finalAd={finalAd} />
>>>>>>> origin/main
            </>
          )}
        </div>
      </motion.div>
    </main>
  );
}
