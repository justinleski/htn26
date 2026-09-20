import { useCallback, useEffect, useState } from "react";
import { api, type Dashboard } from "@/contexts/data/api";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";
export function useMerchantDashboard() {
  const { connected } = useStoreConnection();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!connected) { setData(null); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(null);
    api<Dashboard>("/api/dashboard", { signal: controller.signal }).then(setData)
      .catch((error: Error) => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [connected, revision]);
  return { data, loading, error, refresh };
}
