import { useState } from "react";
import type { CreativeExperiment } from "@/contexts/data/types";

export function OptimizedAdCard({ finalAd }: { finalAd: NonNullable<CreativeExperiment["finalAd"]> }) {
  const [caption, setCaption] = useState(finalAd.caption);
  const [mediaAssetUrl, setMediaAssetUrl] = useState(finalAd.mediaAssetUrl);
  const [hashtagsText, setHashtagsText] = useState(finalAd.hashtags.join(" "));

  return (
    <div className="flex w-72 shrink-0 flex-col gap-4 rounded-2xl border border-[var(--color-accent)] bg-[var(--color-accent)]/10 p-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-[var(--color-accent)] uppercase">
          Optimized ad
        </p>
        <h3 className="text-base font-semibold">All three winners, assembled</h3>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-[var(--color-muted)]">Caption</span>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          className="resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm leading-relaxed outline-none focus:border-[var(--color-accent)]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-[var(--color-muted)]">Media asset</span>
        <input
          value={mediaAssetUrl}
          onChange={(e) => setMediaAssetUrl(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none focus:border-[var(--color-accent)]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-[var(--color-muted)]">Hashtags</span>
        <input
          value={hashtagsText}
          onChange={(e) => setHashtagsText(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-[var(--color-accent)] outline-none focus:border-[var(--color-accent)]"
        />
      </label>
    </div>
  );
}
