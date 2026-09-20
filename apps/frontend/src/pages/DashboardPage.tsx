import { useRef, useState, type ChangeEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";
import { useMerchantDashboard } from "@/hooks/useMerchantDashboard";
import { DataState } from "@/components/DataState";
import { post } from "@/contexts/data/api";

const panel = "paper rounded-2xl p-5 sm:p-6";
const button = "rounded-full border border-[var(--color-mark)]/40 px-4 py-2.5 text-sm font-semibold text-[var(--color-mark)] transition-colors hover:bg-[var(--color-mark-tint)] disabled:opacity-50";
const muted = "text-sm text-[var(--color-ink-muted)]";

export function DashboardPage() {
  const { connected, storeName } = useStoreConnection();
  const { data, loading, error, refresh } = useMerchantDashboard();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [kind, setKind] = useState("reviews");
  const running = useRef(false);

  async function run(path: string, body = {}) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setNotice(null);
    setActionError(null);
    try {
      const result = await post<{ ok: boolean; message: string; warning?: string; error?: string }>(path, body);
      if (!result.ok) throw new Error(result.error || "The store update could not be completed.");
      setNotice([result.message, result.warning].filter(Boolean).join(" "));
      refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Request failed.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (file.size > 5 * 1024 * 1024) {
      setActionError("Choose a file smaller than 5 MB.");
      return;
    }
    const format = file.name.toLowerCase().endsWith(".csv") ? "csv" : "json";
    try {
      await run("/api/import", { kind, format, input: await file.text() });
    } catch {
      setActionError("Could not read this file.");
    }
  }

  if (!connected) return <Navigate to="/" replace />;
  if (!data || error) return <DataState loading={loading} error={error} retry={refresh} />;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col gap-6"
      >
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-mark)] sm:text-3xl">Dashboard</h1>
          <p className={`mt-2 ${muted}`}>{storeName} · Shopify catalog and imported marketing evidence</p>
        </div>

        {notice ? <p role="status" className={`${panel} text-sm`}>{notice}</p> : null}
        {actionError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{actionError}</p> : null}

        <section className={panel}>
          <h2 className="font-display text-lg">Bring in your data</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className={button} disabled={busy} onClick={() => void run("/api/sync")}>{busy ? "Working…" : "Sync Shopify products"}</button>
            <button type="button" className={button} disabled={busy} onClick={() => void run("/api/import/demo")}>Import labelled demo</button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label htmlFor="import-kind" className="text-sm font-medium">Upload</label>
            <select
              id="import-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              disabled={busy}
              className="rounded-xl border border-[var(--border-ink)] bg-[var(--color-paper-dim)] px-3 py-2 text-sm focus:outline-[var(--color-mark)]"
            >
              <option value="reviews">Reviews</option>
              <option value="ads">Ad history</option>
            </select>
            <input
              aria-label="CSV or JSON import file"
              type="file"
              accept=".json,.csv"
              disabled={busy}
              onChange={(event) => void upload(event)}
              className="max-w-full min-w-0 text-sm text-[var(--color-ink-muted)] file:mr-3 file:rounded-full file:border file:border-[var(--border-ink)] file:bg-[var(--color-paper-dim)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--color-ink)]"
            />
          </div>
          <p className={`mt-4 leading-relaxed ${muted}`}>CSV or JSON, up to 5 MB. Use a product ID listed below. Meta and Google Ads are not connected; ad metrics come from your imports.</p>
        </section>

        <section aria-label="Store overview" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ["Products", data.products.length],
            ["Reviews", data.reviews.length],
            ["Historical ad rows", data.ads.length],
          ].map(([label, value]) => (
            <div key={label} className={panel}>
              <p className="text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">{label}</p>
              <p className="font-mono-num mt-2 text-3xl font-semibold text-[var(--color-mark)]">{value}</p>
            </div>
          ))}
        </section>

        {data.metrics.groups.map((group) => (
          <section key={`${group.currency}-${group.periodStart}-${group.periodEnd}`} className={panel}>
            <h2 className="font-display text-lg">Imported ad performance</h2>
            <p className={`mt-1 ${muted}`}>{group.periodStart.slice(0, 10)} – {group.periodEnd.slice(0, 10)} · {group.currency}</p>
            <dl className="mt-5 grid grid-cols-3 gap-3">
              {[["CTR", group.ctr], ["Conversion", group.conversionRate], ["ROAS", group.roas]].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-[var(--color-ink-muted)]">{label}</dt>
                  <dd className="font-mono-num mt-1 text-xl font-semibold text-[var(--color-mark)] sm:text-2xl">{value}</dd>
                </div>
              ))}
            </dl>
            <p className={`mt-5 border-t border-[var(--border-ink)] pt-4 leading-relaxed ${muted}`}>Spend {group.totals.spend.toFixed(2)} {group.currency} · Attributed revenue {group.totals.attributedRevenue.toFixed(2)} {group.currency}. Conversion = purchases / clicks. Imported attribution, not total Shopify sales.</p>
          </section>
        ))}

        <section className={panel}>
          <h2 className="font-display text-lg">Products</h2>
          {!data.products.length ? <p className={`mt-3 ${muted}`}>Sync Shopify products to get started.</p> : (
            <ul className="mt-2 divide-y divide-[var(--border-ink)]">
              {data.products.map((product) => (
                <li key={product.id} className="py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <strong className="text-sm">{product.title}{product.demo ? <span className="ml-2 rounded-full bg-[var(--color-mark-tint)] px-2 py-1 text-xs font-medium text-[var(--color-mark)]">Demo product</span> : null}</strong>
                    <span className="font-mono-num text-sm">{product.price} {product.currency}</span>
                  </div>
                  <p className={`mt-2 ${muted}`}>{product.reviewCount} reviews · {product.adCount} ad rows</p>
                  <p className="mt-1 break-all text-xs text-[var(--color-ink-muted)]">ID: <code>{product.id}</code></p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={panel}>
          <h2 className="font-display text-lg">Historical ads</h2>
          {!data.ads.length ? <p className={`mt-3 ${muted}`}>Import ad history or load the labelled demo.</p> : (
            <ul className="mt-2 divide-y divide-[var(--border-ink)]">
              {data.ads.map((ad) => (
                <li key={ad.sourceId} className="py-4">
                  <p className="text-sm font-medium leading-relaxed">{ad.messaging}</p>
                  <p className={`mt-2 ${muted}`}>{ad.productTitle} · {ad.channel} · {ad.attribution}</p>
                  <p className="font-mono-num mt-2 text-xs text-[var(--color-mark)]">CTR {ad.ctr} · Conversion {ad.conversionRate} · ROAS {ad.roas}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link to="/insights" className="self-start rounded-full bg-[var(--color-mark)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-mark-hover)]">View insights →</Link>
      </motion.div>
    </main>
  );
}
