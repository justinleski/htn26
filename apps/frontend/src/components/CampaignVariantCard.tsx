import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import type { CampaignVariant } from "@/contexts/data/types";

export function CampaignVariantCard({ variant }: { variant: CampaignVariant }) {
  const [hook, setHook] = useState(variant.hook);
  const [caption, setCaption] = useState(variant.caption);
  const [hashtagsText, setHashtagsText] = useState(variant.hashtags.join(" "));

  return (
    <div className="paper flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-[var(--color-ink-muted)] uppercase">
          {variant.label}
        </p>
        <CopyButton
          label="Copy all"
          getText={() =>
            `${hook}\n\n${caption}\n\n${hashtagsText}\n\nMedia notes:\n${variant.mediaRecommendations.map((p) => `- ${p}`).join("\n")}`
          }
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-[var(--color-ink-muted)]">Hook</span>
        <input
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          className="rounded-xl border border-[var(--color-ink)]/20 bg-[var(--color-paper-dim)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-[var(--color-ink-muted)]">Caption</span>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={5}
          className="resize-none rounded-xl border border-[var(--color-ink)]/20 bg-[var(--color-paper-dim)] px-3 py-2 text-sm leading-relaxed text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-[var(--color-ink-muted)]">Hashtags</span>
        <input
          value={hashtagsText}
          onChange={(e) => setHashtagsText(e.target.value)}
          className="font-mono-num rounded-xl border border-[var(--color-ink)]/20 bg-[var(--color-paper-dim)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-[var(--color-ink-muted)]">
          What to shoot for the image/video
        </span>
        <ul className="flex flex-col gap-1.5 rounded-xl border border-[var(--color-ink)]/20 bg-[var(--color-paper-dim)] p-3">
          {variant.mediaRecommendations.map((point) => (
            <li key={point} className="flex gap-2 text-sm leading-snug text-[var(--color-ink)]">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--color-ink-muted)]" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
