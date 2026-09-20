import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { MediaPlaceholder } from "@/components/MediaPlaceholder";
import type { CreativeExperiment } from "@/contexts/data/types";

export function OptimizedAdCard({ finalAd }: { finalAd: NonNullable<CreativeExperiment["finalAd"]> }) {
  const [caption, setCaption] = useState(finalAd.caption);
  const [mediaAssetUrl, setMediaAssetUrl] = useState(finalAd.mediaAssetUrl);
  const [hashtagsText, setHashtagsText] = useState(finalAd.hashtags.join(" "));

  return (
    <div className="paper flex w-72 shrink-0 flex-col gap-4 rounded-2xl border-2 border-[var(--color-mark)]/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium tracking-wide text-[var(--color-ink-muted)] uppercase">
            Optimized ad
          </p>
          <h3 className="font-display text-base font-semibold">All three winners, assembled</h3>
        </div>
        <CopyButton
          label="Copy all"
          getText={() => `${caption}\n\n${hashtagsText}`}
          className="shrink-0"
        />
      </div>

      <MediaPlaceholder
        variant={{ mediaAssetUrl, mediaType: finalAd.mediaType }}
        size="lg"
      />

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-ink-muted)]">Caption</span>
          <CopyButton getText={() => caption} />
        </span>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          className="resize-none rounded-xl border border-[var(--color-ink)]/20 bg-[var(--color-paper-dim)] px-3 py-2 text-sm leading-relaxed text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-[var(--color-ink-muted)]">Media asset</span>
        <input
          value={mediaAssetUrl}
          onChange={(e) => setMediaAssetUrl(e.target.value)}
          className="font-mono-num rounded-xl border border-[var(--color-ink)]/20 bg-[var(--color-paper-dim)] px-3 py-2 text-xs text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-ink-muted)]">Hashtags</span>
          <CopyButton getText={() => hashtagsText} />
        </span>
        <input
          value={hashtagsText}
          onChange={(e) => setHashtagsText(e.target.value)}
          className="font-mono-num rounded-xl border border-[var(--color-ink)]/20 bg-[var(--color-paper-dim)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
        />
      </label>
    </div>
  );
}
