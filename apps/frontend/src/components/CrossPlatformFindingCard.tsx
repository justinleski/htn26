import { PlatformTag } from "@/components/PlatformTag";
import type { CrossPlatformFinding } from "@/contexts/data/types";

export function CrossPlatformFindingCard({ finding }: { finding: CrossPlatformFinding }) {
  const isWarning = finding.kind === "platform-gap";

  return (
    <div className="paper rounded-2xl p-4">
      <p className="font-display text-sm font-semibold">
        {isWarning && <span aria-hidden="true">⚠ </span>}
        {finding.headline}
      </p>
      <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">{finding.explanation}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {finding.platforms.map((platform) => (
          <PlatformTag
            key={platform}
            platform={platform}
            className="text-xs text-[var(--color-ink-muted)]"
          />
        ))}
      </div>
    </div>
  );
}
