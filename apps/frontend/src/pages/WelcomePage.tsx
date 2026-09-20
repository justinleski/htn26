import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useStoreConnection } from "@/contexts/StoreConnectionContext";
export function WelcomePage() {
  const { connect, connected } = useStoreConnection();
  const [shop, setShop] = useState("");
  const [connecting, setConnecting] = useState(false);
  const failed = new URLSearchParams(window.location.search).has("authError");
  if (connected) return <Navigate to="/dashboard" replace />;
  function submit(event: FormEvent) { event.preventDefault(); setConnecting(true); connect(shop); }
  return <main className="mx-auto flex min-h-[80dvh] max-w-3xl flex-col justify-center px-6">
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
    <p className="mb-3 text-sm tracking-wide text-[var(--color-ink-muted)]">Marketing Copilot</p>
    <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Know why your best stuff works.</h1>
    <p className="mt-4 max-w-xl text-lg text-[var(--color-ink-muted)]">Connect Shopify, sync your products, and import reviews and ad history to plan your next campaign.</p>
    {failed ? <p role="alert" className="mt-4 text-[var(--color-flag)]">Shopify sign-in could not be completed. Please try connecting again.</p> : null}
    <form onSubmit={submit} className="mt-8 flex max-w-lg flex-col gap-3">
      <label htmlFor="shop">Shopify store domain</label>
      <input id="shop" value={shop} onChange={(event) => setShop(event.target.value)} required pattern="[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com" placeholder="your-store.myshopify.com" autoComplete="url" spellCheck={false} className="paper rounded-lg px-4 py-3 outline-none focus:border-[var(--color-mark)]" />
      <motion.button whileTap={{ scale: 0.97 }} disabled={connecting} className="rounded-full bg-[var(--color-mark)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--color-mark-hover)] disabled:opacity-60">{connecting ? "Opening Shopify…" : "Connect Shopify store"}</motion.button>
      <p className="text-xs text-[var(--color-ink-muted)]">You’ll approve access on Shopify. Ad history and reviews are imported separately.</p>
    </form>
    </motion.div>
  </main>;
}
