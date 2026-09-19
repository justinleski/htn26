import { motion } from "framer-motion";

export function WelcomePage() {
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
          Welcome
        </h1>
        <p className="mt-4 max-w-xl text-lg text-[var(--color-muted)]">
          Placeholder landing page. Replace this copy when product UI work
          starts.
        </p>
      </motion.div>
    </main>
  );
}
