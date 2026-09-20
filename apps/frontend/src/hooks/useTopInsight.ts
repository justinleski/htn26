import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/contexts/data/api";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";
import { useMerchantDashboard } from "@/hooks/useMerchantDashboard";

type DashboardAction = "sync" | "import-demo";
interface ActionResult {
  ok: boolean;
  message?: string;
  warning?: string;
  error?: string;
}

export function useTopInsight() {
  const dashboard = useMerchantDashboard();
  const { connected, storeName } = useStoreConnection();
  const [action, setAction] = useState<DashboardAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    setAction(null);
    setActionError(null);
    setNotice(null);
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, [connected, storeName]);

  const { refresh } = dashboard;
  const reload = useCallback(() => {
    setActionError(null);
    refresh();
  }, [refresh]);

  const runAction = useCallback(async (next: DashboardAction) => {
    if (!connected || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setAction(next);
    setActionError(null);
    setNotice(null);
    try {
      const result = await api<ActionResult>(next === "sync" ? "/api/sync" : "/api/import/demo", {
        method: "POST",
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      if (!result.ok) throw new Error(result.error || "The store update could not be completed.");
      if (controller.signal.aborted) return;
      setNotice([result.message, result.warning].filter(Boolean).join(" ") || "Store data updated.");
      refresh();
    } catch (error) {
      if (!controller.signal.aborted) {
        setActionError(error instanceof Error ? error.message : "The store update could not be completed.");
      }
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setAction(null);
      }
    }
  }, [connected, refresh]);

  return {
    ...dashboard,
    insight: dashboard.data?.findings.find((finding) => finding.kind === "working") ?? dashboard.data?.findings[0] ?? null,
    error: dashboard.error || actionError,
    action,
    notice,
    busy: dashboard.loading || action !== null,
    sync: () => runAction("sync"),
    importDemo: () => runAction("import-demo"),
    reload,
  };
}
