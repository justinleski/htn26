import type { CrossPlatformFinding } from "@/contexts/data/types";

export function CrossPlatformFindingCard({ finding }: { finding: CrossPlatformFinding }) {
  const isWarning = finding.kind === "platform-gap";

  return (
    <div
      className={`rounded-xl border p-4 ${
        isWarning
          ? "border-amber-400/30 bg-amber-400/5"
          : "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5"
      }`}
    >
      <p className="text-sm font-medium">{finding.headline}</p>
      <p className="mt-1.5 text-sm text-[var(--color-muted)]">{finding.explanation}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {finding.platforms.map((platform) => (
          <span
            key={platform}
            className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-xs text-[var(--color-muted)]"
          >
            {platform}
          </span>
        ))}
      </div>
    </div>
  );
}
