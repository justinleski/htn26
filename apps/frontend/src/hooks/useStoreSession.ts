import { useCallback, useEffect, useState } from "react";
import { api, post } from "@/contexts/data/api";
export function useStoreSession() {
  const [session, setSession] = useState<{ connected: boolean; shop: string | null }>({ connected: false, shop: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    api<typeof session>("/api/session", { signal: controller.signal })
      .then(setSession).catch((error: Error) => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const expired = () => setSession({ connected: false, shop: null });
    window.addEventListener("session-expired", expired);
    return () => { controller.abort(); window.removeEventListener("session-expired", expired); };
  }, []);
  const connect = useCallback((shop: string) => {
    window.location.assign(`/api/auth/start?shop=${encodeURIComponent(shop.trim().toLowerCase())}`);
  }, []);
  const logout = useCallback(async () => {
    await post("/api/logout");
    setSession({ connected: false, shop: null });
  }, []);
  return { connected: session.connected, storeName: session.shop ?? "", loading, error, connect, logout };
}
