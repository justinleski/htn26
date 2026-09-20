import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BackButton } from "@/components/BackButton";
import { CreativeRoundColumn } from "@/components/CreativeRoundColumn";
import { OptimizedAdCard } from "@/components/OptimizedAdCard";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";
import { useCreativeExperiment } from "@/hooks/useCreativeExperiment";
import { getMockCreativeExperiment } from "@/contexts/data/creativeTestData";
import { products } from "@/contexts/data/mockData";

const experiment = getMockCreativeExperiment();

function FunnelArrowDown() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-[var(--color-ink-on-dark)]/40"
      aria-hidden="true"
    >
      <line x1="12" y1="3" x2="12" y2="19" />
      <polyline points="5 12 12 19 19 12" />
    </svg>
  );
}

export function CreativeTestingPage() {
  const { connected, ready } = useStoreConnection();
  const navigate = useNavigate();
  const { rounds, finalAd, selectVariant } = useCreativeExperiment(experiment);

  if (!ready) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      </main>
    );
  }

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
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight text-[var(--color-mark)] sm:text-3xl">
          Creative testing{product ? ` — ${product.title}` : ""}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-ink-on-dark)]/60">
          Each round isolates one creative variable and locks in the winner by
          conversion rate before testing the next. Click a row to see the full
          post and pick what feeds the optimized ad. Click a column header to
          re-sort a round's table.
        </p>

        <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-col gap-4 lg:max-h-[calc(100vh-14rem)] lg:flex-1 lg:overflow-y-auto lg:pr-2">
            {rounds.map((round, index) => (
              <div key={round.round} className="flex flex-col gap-4">
                {index > 0 && (
                  <div className="flex justify-center">
                    <FunnelArrowDown />
                  </div>
                )}
                <CreativeRoundColumn
                  round={round}
                  onSelect={(variantId) => selectVariant(round.round, variantId)}
                />
              </div>
            ))}
          </div>

          {finalAd && (
            <div className="lg:sticky lg:top-6 lg:w-80 lg:shrink-0">
              <OptimizedAdCard key={selectionKey} finalAd={finalAd} />
            </div>
          )}
        </div>
      </motion.div>
    </main>
  );
}
