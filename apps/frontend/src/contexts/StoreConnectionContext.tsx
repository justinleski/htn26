import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { storeName } from "@/contexts/data/mockData";

interface StoreConnectionValue {
  connected: boolean;
  storeName: string;
  connect: () => void;
}

const StoreConnectionContext = createContext<StoreConnectionValue | null>(null);

export function StoreConnectionProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);

  const value = useMemo<StoreConnectionValue>(
    () => ({
      connected,
      storeName,
      connect: () => setConnected(true),
    }),
    [connected],
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
