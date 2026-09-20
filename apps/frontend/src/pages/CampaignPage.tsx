import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BackButton } from "@/components/BackButton";
import { CampaignVariantCard } from "@/components/CampaignVariantCard";
import { GeneratingStatus } from "@/components/GeneratingStatus";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";
import { useCampaignGeneration } from "@/hooks/useCampaignGeneration";
import { useTopInsight } from "@/hooks/useTopInsight";
import { products } from "@/contexts/data/mockData";

interface CampaignLocationState {
  productId?: string;
}

export function CampaignPage() {
  const { connected } = useStoreConnection();
  const navigate = useNavigate();
  const location = useLocation();

  const { productId } = (location.state as CampaignLocationState | null) ?? {};
  const product = products.find((p) => p.id === productId) ?? products[0] ?? null;

  const { insight, loading: insightLoading } = useTopInsight();
  const { status, statusLine, variants, runId, regenerate } = useCampaignGeneration(
    product,
    insight,
  );

  if (!connected) {
    return <Navigate to="/" replace />;
  }

  if (!product) {
    return <Navigate to="/insights" replace />;
  }

  if (insightLoading || status === "generating") {
    return <GeneratingStatus line={statusLine} />;
  }

  if (status === "error") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-lg font-medium">Campaign generation failed.</p>
        <motion.button
          onClick={regenerate}
          whileTap={{ scale: 0.96 }}
          className="mt-4 rounded-full bg-[var(--color-mark)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-mark-hover)]"
        >
          Try again
        </motion.button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <BackButton onClick={() => navigate("/insights")} label="Back to insights" />
            <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight text-[var(--color-mark)] sm:text-3xl">
              Campaign for {product.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-ink-on-dark)]/60">
              Generated from your top insight. Edit any field before you ship it.
            </p>
          </div>
          <motion.button
            onClick={regenerate}
            whileTap={{ scale: 0.96 }}
            className="self-start rounded-full border border-[var(--color-mark)]/40 px-5 py-2 text-sm font-semibold text-[var(--color-mark)] transition-colors hover:bg-[var(--color-mark-tint)] sm:self-auto"
          >
            Regenerate
          </motion.button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {variants.map((variant) => (
            <CampaignVariantCard key={`${runId}-${variant.id}`} variant={variant} />
          ))}
        </div>
      </motion.div>
    </main>
  );
}
