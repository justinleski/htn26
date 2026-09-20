import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  const { connected, ready } = useStoreConnection();
  const navigate = useNavigate();
  const location = useLocation();

  const { productId } = (location.state as CampaignLocationState | null) ?? {};
  const { insight, products: liveProducts, loading: insightLoading } = useTopInsight();
  const product =
    liveProducts.find((p) => p.id === productId) ??
    products.find((p) => p.id === productId) ??
    liveProducts[0] ??
    products[0] ??
    null;
  const { status, statusLine, variants, runId, regenerate } = useCampaignGeneration(
    product,
    insight,
  );

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6">
        <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      </main>
    );
  }

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
        <p className="text-lg font-medium">Campaign generation failed.</p>
        <button
          onClick={regenerate}
          className="mt-4 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-black"
        >
          Try again
        </button>
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
            <button
              onClick={() => navigate("/insights")}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              ← Back to insights
            </button>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Campaign for {product.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Generated from your top insight. Edit any field before you ship it.
            </p>
          </div>
          <button
            onClick={regenerate}
            className="self-start rounded-lg border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/5 sm:self-auto"
          >
            Regenerate
          </button>
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
