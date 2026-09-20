import { useState } from "react";

export function ConnectAccountButton({
  label,
  connected,
  onConnect,
}: {
  label: string;
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
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
        connected
          ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
          : "border-white/15 hover:bg-white/5 disabled:opacity-60"
      }`}
    >
      {connected ? (
        `✓ ${label} connected`
      ) : connecting ? (
        <>
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-[var(--color-fg)]" />
          Connecting {label}...
        </>
      ) : (
        `Connect ${label}`
      )}
    </button>
  );
}
