import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { storeName } from "@/contexts/data/mockData";

<<<<<<< HEAD
=======
export type AdAccountKey = "facebookAds" | "googleAds";

>>>>>>> origin/main
interface StoreConnectionValue {
  connected: boolean;
  storeName: string;
  connect: () => void;
<<<<<<< HEAD
=======
  connectedAdAccounts: Record<AdAccountKey, boolean>;
  connectAdAccount: (account: AdAccountKey) => void;
>>>>>>> origin/main
}

const StoreConnectionContext = createContext<StoreConnectionValue | null>(null);

export function StoreConnectionProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
<<<<<<< HEAD
=======
  const [connectedAdAccounts, setConnectedAdAccounts] = useState<Record<AdAccountKey, boolean>>({
    facebookAds: false,
    googleAds: false,
  });
>>>>>>> origin/main

  const value = useMemo<StoreConnectionValue>(
    () => ({
      connected,
      storeName,
      connect: () => setConnected(true),
<<<<<<< HEAD
    }),
    [connected],
=======
      connectedAdAccounts,
      connectAdAccount: (account) =>
        setConnectedAdAccounts((prev) => ({ ...prev, [account]: true })),
    }),
    [connected, connectedAdAccounts],
>>>>>>> origin/main
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
