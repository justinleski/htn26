import { useState } from "react";
import type { CampaignVariant } from "@/contexts/data/types";

export function CampaignVariantCard({ variant }: { variant: CampaignVariant }) {
  const [hook, setHook] = useState(variant.hook);
  const [caption, setCaption] = useState(variant.caption);
  const [hashtagsText, setHashtagsText] = useState(variant.hashtags.join(" "));

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-medium tracking-wide text-[var(--color-accent)] uppercase">
        {variant.label}
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-[var(--color-muted)]">Hook</span>
        <input
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-medium outline-none focus:border-[var(--color-accent)]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-[var(--color-muted)]">Caption</span>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={5}
          className="resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm leading-relaxed outline-none focus:border-[var(--color-accent)]"
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
