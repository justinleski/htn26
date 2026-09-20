import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { BackButton } from "@/components/BackButton";
import { CopyButton } from "@/components/CopyButton";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";
import { useMerchantDashboard } from "@/hooks/useMerchantDashboard";
import { api, post, type CampaignSummary, type SavedCampaign } from "@/contexts/data/api";

interface CampaignLocationState {
  productId?: string;
}

const panel = "paper rounded-2xl p-5 sm:p-6";
const muted = "text-sm text-[var(--color-ink-muted)]";

export function CampaignPage() {
  const { connected } = useStoreConnection();
  const { data, error: dashboardError } = useMerchantDashboard();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedProductId = (location.state as CampaignLocationState | null)?.productId;
  const [params, setParams] = useSearchParams();
  const id = params.get("id");
  const [productId, setProductId] = useState(selectedProductId ?? "");
  const [campaign, setCampaign] = useState<SavedCampaign | null>(null);
  const [history, setHistory] = useState<CampaignSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const running = useRef(false);

  useEffect(() => {
    if (selectedProductId && !id) setProductId(selectedProductId);
  }, [selectedProductId, id]);

  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setCampaign(null);
    Promise.all([
      api<CampaignSummary[]>("/api/campaigns", { signal: controller.signal }).then((rows) => {
        if (!controller.signal.aborted) setHistory(rows);
      }),
      id
        ? api<SavedCampaign>(`/api/campaigns/${encodeURIComponent(id)}`, { signal: controller.signal }).then((saved) => {
          if (!controller.signal.aborted) {
            setCampaign(saved);
            setProductId(saved.productId);
          }
        })
        : Promise.resolve(),
    ]).catch((error: Error) => {
      if (!controller.signal.aborted) setError(error.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [connected, id, revision]);

  async function generate() {
    if (running.current || !productId || !data?.canGenerate) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      const saved = await post<SavedCampaign>("/api/generate", { productId });
      setParams({ id: saved.id });
      setRevision((value) => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  if (!connected) return <Navigate to="/" replace />;
  const savedProduct = data?.products.find((product) => product.id === campaign?.productId);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col gap-6"
      >
        <div>
          <BackButton onClick={() => navigate("/insights")} label="Back to insights" />
          <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight text-[var(--color-mark)] sm:text-3xl">Campaigns</h1>
          <p className={`mt-2 ${muted}`}>Turn product evidence into messaging, then revisit every saved campaign.</p>
        </div>

        <section className={panel}>
          <h2 className="font-display text-lg">Generate from your evidence</h2>
          <p className={`mt-2 ${muted}`}>Analyze evidence, draft messaging, and check claims. Completed campaigns are saved automatically for review.</p>
          {!data?.canGenerate && !dashboardError ? <p className="mt-3 text-sm text-amber-800">Generation needs a configured provider and imported evidence.</p> : null}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label htmlFor="campaign-product" className="flex min-w-0 flex-1 flex-col gap-2 text-sm font-medium">
              Product
              <select
                id="campaign-product"
                className="w-full rounded-xl border border-[var(--border-ink)] bg-[var(--color-paper-dim)] px-3 py-2.5 text-[var(--color-ink)] focus:outline-[var(--color-mark)]"
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                disabled={busy}
              >
                <option value="">Select a product</option>
                {data?.products.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}
              </select>
            </label>
            <button
              type="button"
              className="shrink-0 rounded-full bg-[var(--color-mark)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-mark-hover)] disabled:opacity-50"
              disabled={busy || !productId || !data?.canGenerate}
              onClick={() => void generate()}
            >
              {busy ? "Generating and checking…" : "Generate & save"}
            </button>
          </div>
          {busy ? <p role="status" className={`mt-4 ${muted}`}>This can take up to a few minutes. Your campaign will be saved when complete.</p> : null}
        </section>

        {error || dashboardError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error || dashboardError}</p> : null}
        {loading ? <p role="status" className={muted}>Loading saved campaigns…</p> : null}

        {campaign ? (
          <section className="flex flex-col gap-5" aria-label="Saved campaign">
            <div className={panel}>
              <p className="text-xs font-semibold tracking-wide text-[var(--color-mark)] uppercase">Saved campaign{savedProduct ? ` · ${savedProduct.title}` : ""}</p>
              <h2 className="font-display mt-2 text-xl">{campaign.objective}</h2>
              <p className={`mt-2 ${muted}`}>{new Date(campaign.createdAt).toLocaleString()}</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div><h3 className="text-sm font-semibold">Audience</h3><p className={`mt-1 ${muted}`}>{campaign.audience}</p></div>
                <div><h3 className="text-sm font-semibold">Strategy</h3><p className={`mt-1 ${muted}`}>{campaign.strategy}</p></div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">Hooks and captions</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {campaign.hooks.map((hook, index) => (
                  <article key={`${campaign.id}-hook-${index}`} className="paper flex flex-col gap-4 rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">Copy {index + 1}</p>
                      <CopyButton label="Copy all" getText={() => [hook, campaign.captions[index]].filter(Boolean).join("\n\n")} />
                    </div>
                    <h4 className="font-display text-base">{hook}</h4>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink-muted)]">{campaign.captions[index]}</p>
                  </article>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">A/B variations</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {campaign.variants.map((variant, index) => (
                  <article key={`${campaign.id}-variant-${index}`} className={panel}>
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-display text-base text-[var(--color-mark)]">{variant.name}</h4>
                      <CopyButton getText={() => variant.content} />
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{variant.content}</p>
                    <div className="mt-4 border-t border-[var(--border-ink)] pt-4">
                      <p className={muted}><strong className="text-[var(--color-ink)]">Changed element:</strong> {variant.changedElement}</p>
                      <p className={`mt-2 ${muted}`}><strong className="text-[var(--color-ink)]">Hypothesis:</strong> {variant.hypothesis}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className={panel}>
              <h3 className="font-display text-lg">Evidence and claim review</h3>
              <p className={`mt-3 break-words ${muted}`}>Sources: {campaign.supportingSourceIds.join(", ")}</p>
              <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm text-[var(--color-ink-muted)]">
                {campaign.validationResults.map((result, index) => <li key={index}>{result}</li>)}
              </ul>
            </div>
          </section>
        ) : null}

        <section className={panel}>
          <h2 className="font-display text-lg">Saved campaigns</h2>
          {!loading && !history.length ? <p className={`mt-3 ${muted}`}>No saved campaigns yet.</p> : null}
          <ul className="mt-3 divide-y divide-[var(--border-ink)]">
            {history.map((row) => (
              <li key={row.id} className="py-3">
                <button
                  type="button"
                  disabled={busy}
                  aria-current={id === row.id ? "page" : undefined}
                  className="text-left text-sm font-semibold text-[var(--color-mark)] underline-offset-4 hover:underline disabled:opacity-50"
                  onClick={() => setParams({ id: row.id })}
                >
                  {row.product.title} — {row.objective}
                </button>
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{new Date(row.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </section>
      </motion.div>
    </main>
  );
}
