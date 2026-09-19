import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { storeName } from "@/contexts/data/mockData";

export type AdAccountKey = "facebookAds" | "googleAds";

interface StoreConnectionValue {
  connected: boolean;
  storeName: string;
  connect: () => void;
  connectedAdAccounts: Record<AdAccountKey, boolean>;
  connectAdAccount: (account: AdAccountKey) => void;
}

const StoreConnectionContext = createContext<StoreConnectionValue | null>(null);

export function StoreConnectionProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connectedAdAccounts, setConnectedAdAccounts] = useState<Record<AdAccountKey, boolean>>({
    facebookAds: false,
    googleAds: false,
  });

  const value = useMemo<StoreConnectionValue>(
    () => ({
      connected,
      storeName,
      connect: () => setConnected(true),
      connectedAdAccounts,
      connectAdAccount: (account) =>
        setConnectedAdAccounts((prev) => ({ ...prev, [account]: true })),
    }),
    [connected, connectedAdAccounts],
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
