import { useState } from "react";
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
    <button
      type="button"
      onClick={handleClick}
      disabled={connected || connecting}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        connected
          ? "border-[var(--color-ink-on-dark)]/40 bg-[var(--color-ink-on-dark)]/10 text-[var(--color-ink-on-dark)]"
          : "border-[var(--color-ink-on-dark)]/25 text-[var(--color-ink-on-dark)]/80 hover:border-[var(--color-ink-on-dark)]/50 hover:text-[var(--color-ink-on-dark)] disabled:opacity-60"
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
    </button>
  );
}
