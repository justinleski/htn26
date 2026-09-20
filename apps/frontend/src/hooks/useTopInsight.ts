import { useCallback, useEffect, useState } from "react";
import { adaptDashboard, isDashboardEmpty, unwrapDashboard } from "@/contexts/data/adaptDashboard";
import {
  CopilotApiError,
  fetchDashboard,
  importDemo as importDemoRequest,
  syncStore,
  type MerchantActionResult,
} from "@/contexts/data/copilotApi";
import type { AdPerformance, Insight, Product, Review } from "@/contexts/data/types";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";

const autoFilledTokens = new Set<string>();

export type DashboardAction = "sync" | "import-demo";

interface UseTopInsightOptions {
  autoFillEmpty?: boolean;
}

function actionMessage(result: MerchantActionResult, fallback: string): string {
  if (result.error?.trim()) return result.error;
  if (result.warning?.trim()) return result.warning;
  if (result.message?.trim()) return result.message;
  return fallback;
}

export function useTopInsight(options: UseTopInsightOptions = {}) {
  const { autoFillEmpty = false } = options;
  const { token, connected, ready, disconnect } = useStoreConnection();

  const [insight, setInsight] = useState<Insight | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [ads, setAds] = useState<AdPerformance[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [action, setAction] = useState<DashboardAction | null>(null);

  const applyDashboard = useCallback((raw: unknown) => {
    const adapted = adaptDashboard(raw);
    setProducts(adapted.products);
    setAds(adapted.ads);
    setReviews(adapted.reviews);
    setInsight(adapted.insight);
    return adapted;
  }, []);

  const handleAuthFailure = useCallback(
    (err: unknown) => {
      if (err instanceof CopilotApiError && (err.status === 401 || err.status === 403)) {
        disconnect();
        setError("Session expired. Reconnect your store.");
        return true;
      }
      return false;
    },
    [disconnect],
  );

  const load = useCallback(
    async (opts?: { autoFill?: boolean }) => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let raw = unwrapDashboard(await fetchDashboard(token));

        if (opts?.autoFill && isDashboardEmpty(raw) && !autoFilledTokens.has(token)) {
          autoFilledTokens.add(token);
          setAction("sync");
          try {
            const syncResult = await syncStore(token);
            if (syncResult.ok === false) {
              setNotice(actionMessage(syncResult, "Product sync failed."));
            } else {
              setNotice(actionMessage(syncResult, "Synced products."));
            }
          } catch (syncError) {
            if (handleAuthFailure(syncError)) throw syncError;
            setNotice(syncError instanceof Error ? syncError.message : "Product sync failed.");
          }

          setAction("import-demo");
          const importResult = await importDemoRequest(token);
          if (importResult.ok === false) {
            throw new Error(actionMessage(importResult, "Labelled demo import failed."));
          }
          setNotice(actionMessage(importResult, "Loaded labelled demo reviews and ads."));
          raw = unwrapDashboard(await fetchDashboard(token));
        }

        applyDashboard(raw);
      } catch (err) {
        if (!handleAuthFailure(err)) {
          setError(err instanceof Error ? err.message : "Could not load dashboard.");
        }
      } finally {
        setAction(null);
        setLoading(false);
      }
    },
    [applyDashboard, handleAuthFailure, token],
  );

  useEffect(() => {
    if (!ready) return;
    if (!connected || !token) {
      setLoading(false);
      return;
    }
    void load({ autoFill: autoFillEmpty });
  }, [autoFillEmpty, connected, load, ready, token]);

  const sync = useCallback(async () => {
    if (!token) return;
    setAction("sync");
    setError(null);
    try {
      const result = await syncStore(token);
      if (result.ok === false) {
        throw new Error(actionMessage(result, "Product sync failed."));
      }
      setNotice(actionMessage(result, "Synced products."));
      await load();
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err instanceof Error ? err.message : "Product sync failed.");
      }
      setAction(null);
    }
  }, [handleAuthFailure, load, token]);

  const importDemo = useCallback(async () => {
    if (!token) return;
    setAction("import-demo");
    setError(null);
    try {
      const result = await importDemoRequest(token);
      if (result.ok === false) {
        throw new Error(actionMessage(result, "Labelled demo import failed."));
      }
      setNotice(actionMessage(result, "Loaded labelled demo reviews and ads."));
      await load();
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err instanceof Error ? err.message : "Labelled demo import failed.");
      }
      setAction(null);
    }
  }, [handleAuthFailure, load, token]);

  return {
    insight,
    products,
    ads,
    reviews,
    loading,
    error,
    notice,
    action,
    busy: loading || action !== null,
    sync,
    importDemo,
    reload: load,
  };
}
