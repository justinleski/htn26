import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  clearStoredToken,
  CopilotApiError,
  DEFAULT_SHOP,
  fetchSession,
  getLoginUrl,
  readStoredToken,
  writeStoredToken,
} from "@/contexts/data/copilotApi";

interface StoreConnectionValue {
  ready: boolean;
  connected: boolean;
  token: string | null;
  shop: string;
  storeName: string;
  defaultShop: string;
  connect: (shop?: string) => void;
  disconnect: () => void;
}

const StoreConnectionContext = createContext<StoreConnectionValue | null>(null);

export function StoreConnectionProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [shop, setShop] = useState(DEFAULT_SHOP);
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    let cancelled = false;
    const urlToken = searchParams.get("token");
    const candidate = urlToken ?? readStoredToken();

    if (urlToken) {
      writeStoredToken(urlToken);
      const next = new URLSearchParams(searchParams);
      next.delete("token");
      setSearchParams(next, { replace: true });
    }

    if (!candidate) {
      setReady(true);
      return;
    }

    fetchSession(candidate)
      .then((session) => {
        if (cancelled) return;
        setToken(candidate);
        setConnected(true);
        setShop(session.shop || DEFAULT_SHOP);
        setStoreName(session.storeName || session.shop || DEFAULT_SHOP);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof CopilotApiError && (error.status === 401 || error.status === 403)) {
          clearStoredToken();
          setToken(null);
        }
        setConnected(false);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
    // Capture ?token= once on mount (especially /insights after OAuth).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback((shopDomain = DEFAULT_SHOP) => {
    window.location.assign(getLoginUrl(shopDomain.trim() || DEFAULT_SHOP));
  }, []);

  const disconnect = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setConnected(false);
    setStoreName("");
  }, []);

  const value = useMemo<StoreConnectionValue>(
    () => ({
      ready,
      connected,
      token,
      shop,
      storeName,
      defaultShop: DEFAULT_SHOP,
      connect,
      disconnect,
    }),
    [ready, connected, token, shop, storeName, connect, disconnect],
  );

  return (
    <StoreConnectionContext.Provider value={value}>
      {children}
    </StoreConnectionContext.Provider>
  );
}

export function useStoreConnection() {
  const ctx = useContext(StoreConnectionContext);
  if (!ctx) {
    throw new Error("useStoreConnection must be used within StoreConnectionProvider");
  }
  return ctx;
}
