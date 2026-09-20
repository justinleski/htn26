import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";

export function WelcomePage() {
  const navigate = useNavigate();
  const { connect } = useStoreConnection();
  const [connecting, setConnecting] = useState(false);

  function handleConnect() {
    setConnecting(true);
    // Simulated OAuth round-trip. Swap for real Shopify + ad account auth later.
    setTimeout(() => {
      connect();
      navigate("/dashboard");
    }, 600);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <p className="mb-3 text-sm tracking-wide text-[var(--color-ink-on-dark)]/60">
          Marketing Copilot
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Know why your best stuff works.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-[var(--color-ink-on-dark)]/70">
          Connect your store and ad accounts. We'll analyze your products,
          reviews, and ad performance to surface what's actually driving
          conversions — then draft your next campaign from it.
        </p>
        <motion.button
          onClick={handleConnect}
          disabled={connecting}
          whileTap={{ scale: 0.97 }}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--color-mark)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-mark-hover)] disabled:opacity-60"
        >
          {connecting ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-paper)]/30 border-t-[var(--color-paper)]" />
              Connecting store & ad accounts...
            </>
          ) : (
            "Connect Shopify store (demo)"
          )}
        </motion.button>
      </motion.div>
    </main>
  );
}
