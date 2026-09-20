import { useState } from "react";
import { motion } from "framer-motion";
import { PLATFORM_COLOR_VAR } from "@/components/PlatformTag";
import type { Platform } from "@/contexts/data/types";

export function ConnectAccountButton({
  label,
  platform,
  connected,
  onConnect,
}: {
  label: string;
  platform?: Platform;
  connected: boolean;
  onConnect: () => void;
}) {
  const [connecting, setConnecting] = useState(false);

  function handleClick() {
    if (connected || connecting) return;
    setConnecting(true);
    // Simulated OAuth round-trip. Swap for the real ad account auth flow later.
    setTimeout(() => {
      onConnect();
      setConnecting(false);
    }, 600);
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={connected || connecting}
      whileTap={connected || connecting ? {} : { scale: 0.96 }}
      animate={connected ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.25 }}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
        connected
          ? "border-[var(--color-mark)]/50 bg-[var(--color-mark-tint)] text-[var(--color-mark)]"
          : "border-[var(--color-ink)]/30 text-[var(--color-ink)]/80 hover:border-[var(--color-mark)]/50 hover:text-[var(--color-mark)] disabled:opacity-60"
      }`}
    >
      {platform && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: PLATFORM_COLOR_VAR[platform] }}
          aria-hidden="true"
        />
      )}
      {connected ? (
        `✓ ${label} connected`
      ) : connecting ? (
        <>
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-ink-on-dark)]/30 border-t-[var(--color-ink-on-dark)]" />
          Connecting {label}...
        </>
      ) : (
        `Connect ${label}`
      )}
    </motion.button>
  );
}
