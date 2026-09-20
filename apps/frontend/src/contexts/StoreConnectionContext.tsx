import { createContext, useContext, type ReactNode } from "react";
import { useStoreSession } from "@/hooks/useStoreSession";
const StoreConnectionContext = createContext<ReturnType<typeof useStoreSession> | null>(null);
export function StoreConnectionProvider({ children }: { children: ReactNode }) {
  const value = useStoreSession();
  return <StoreConnectionContext.Provider value={value}>{children}</StoreConnectionContext.Provider>;
}
export function useStoreConnection() {
  const ctx = useContext(StoreConnectionContext);
  if (!ctx) throw new Error("useStoreConnection must be used within StoreConnectionProvider");
  return ctx;
}
