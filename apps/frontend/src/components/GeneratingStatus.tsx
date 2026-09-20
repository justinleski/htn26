import { AnimatePresence, motion } from "framer-motion";

export function GeneratingStatus({ line }: { line: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[var(--color-accent)]" />
      <p className="mt-6 text-sm tracking-wide text-[var(--color-muted)] uppercase">
        Generating campaign
      </p>
      <div className="mt-3 h-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={line}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="text-base font-medium"
          >
            {line}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
