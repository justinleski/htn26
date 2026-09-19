import { motion } from "framer-motion";
import type { Insight } from "@/contexts/data/types";

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--color-accent)]/15 to-transparent p-6 sm:p-8"
    >
      <p className="mb-2 text-xs font-medium tracking-wide text-[var(--color-accent)] uppercase">
        Top insight
      </p>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {insight.headline}
      </h2>
      <p className="mt-3 max-w-2xl text-[var(--color-muted)]">
        {insight.explanation}
      </p>
      <div className="mt-5 inline-flex items-center rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium">
        {insight.supportingStat}
      </div>
      <p className="mt-4 text-xs text-[var(--color-muted)]">
        {insight.limitations}
      </p>
    </motion.div>
  );
}
