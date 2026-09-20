import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ConnectAccountButton } from "@/components/ConnectAccountButton";
import { CrossPlatformFindingCard } from "@/components/CrossPlatformFindingCard";
import { StoreSummaryBar } from "@/components/StoreSummaryBar";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";
import { useCrossPlatformFindings } from "@/hooks/useCrossPlatformFindings";
import { adPerformance, products } from "@/contexts/data/mockData";
import { rankAdPerformance } from "@/contexts/data/metrics";

export function DashboardPage() {
  const { connected, storeName, connectedAdAccounts, connectAdAccount } = useStoreConnection();

  const rankedItems = useMemo(() => rankAdPerformance(products, adPerformance), []);

  const summary = useMemo(() => {
    const avg = (fn: (item: (typeof rankedItems)[number]) => number) =>
      rankedItems.length === 0
        ? 0
        : rankedItems.reduce((sum, item) => sum + fn(item), 0) / rankedItems.length;

    return {
      productCount: products.length,
      adCount: adPerformance.length,
      avgCtr: avg((item) => item.ctr),
      avgConversionRate: avg((item) => item.conversionRate),
    };
  }, [rankedItems]);

  const { broadAppeal, platformGaps, loading } = useCrossPlatformFindings(
    adPerformance,
    products,
  );

  if (!connected) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--color-ink-on-dark)]/60">
            Your store at a glance, plus what's working and what isn't across every
            connected ad platform.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ConnectAccountButton
            label="Facebook Ads"
            platform="Facebook"
            connected={connectedAdAccounts.facebookAds}
            onConnect={() => connectAdAccount("facebookAds")}
          />
          <ConnectAccountButton
            label="Google Ads"
            platform="Google"
            connected={connectedAdAccounts.googleAds}
            onConnect={() => connectAdAccount("googleAds")}
          />
        </div>

        <StoreSummaryBar storeName={storeName} {...summary} />

        <div>
          <h3 className="mb-3 text-sm font-medium tracking-wide text-[var(--color-ink-on-dark)]/60 uppercase">
            Performing across platforms
          </h3>
          {loading ? (
            <div className="paper h-24 animate-pulse rounded-xl opacity-50" />
          ) : broadAppeal.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-on-dark)]/60">
              No ad is running on multiple platforms with consistent results yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {broadAppeal.map((finding) => (
                <CrossPlatformFindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium tracking-wide text-[var(--color-ink-on-dark)]/60 uppercase">
            Needs attention
          </h3>
          {platformGaps.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-on-dark)]/60">
              No major platform gaps detected right now.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {platformGaps.map((finding) => (
                <CrossPlatformFindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          )}
        </div>

        <Link
          to="/insights"
          className="self-start rounded-full bg-[var(--color-mark)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-mark-hover)]"
        >
          View insights
        </Link>
      </motion.div>
    </main>
  );
}
