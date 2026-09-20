import { useState } from "react";

export function CopyButton({
  getText,
  label = "Copy",
  className = "",
}: {
  getText: () => string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied or unavailable — button just won't confirm.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] ${className}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
