import { useState } from "react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";

export function WelcomePage() {
  const { connect, connected, ready, defaultShop } = useStoreConnection();
  const [shop, setShop] = useState(defaultShop);
  const [connecting, setConnecting] = useState(false);

  function handleConnect() {
    setConnecting(true);
    connect(shop);
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6">
        <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      </main>
    );
  }

  if (connected) {
    return <Navigate to="/insights" replace />;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <p className="mb-3 text-sm tracking-wide text-[var(--color-muted)]">
          Marketing Copilot
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Know why your best stuff works.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-[var(--color-muted)]">
          Connect your store and ad accounts. We'll analyze your products,
          reviews, and ad performance to surface what's actually driving
          conversions — then draft your next campaign from it.
        </p>
        <label className="mt-8 block max-w-md">
          <span className="text-sm text-[var(--color-muted)]">Shop domain</span>
          <input
            type="text"
            value={shop}
            onChange={(event) => setShop(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </label>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-black transition-opacity disabled:opacity-60"
        >
          {connecting ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              Redirecting to Shopify...
            </>
          ) : (
            "Connect Shopify store"
          )}
        </button>
      </motion.div>
    </main>
  );
}
