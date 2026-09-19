import type { CreativeDimension, Variant } from "@/contexts/data/types";

function MediaThumb({ variant }: { variant: Variant }) {
  return (
    <div className="flex h-20 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-white/10 to-transparent text-lg">
      {variant.mediaType === "video" ? "▶" : "🖼"}
      <span className="ml-1.5 text-xs font-medium text-[var(--color-muted)] capitalize">
        {variant.mediaType}
      </span>
    </div>
  );
}

function VariantPreview({
  dimension,
  variant,
}: {
  dimension: CreativeDimension;
  variant: Variant;
}) {
  if (dimension === "media") {
    return <MediaThumb variant={variant} />;
  }

  if (dimension === "hashtags") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {variant.hashtags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-[var(--color-accent)]"
          >
            {tag}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-[var(--color-muted)] uppercase">
        {variant.captionTheme}
      </p>
      <p className="mt-1 text-sm leading-snug">{variant.caption}</p>
    </div>
  );
}

export function CreativeVariantCard({
  dimension,
  variant,
  isWinner,
  isSelected,
  onSelect,
}: {
  dimension: CreativeDimension;
  variant: Variant;
  isWinner: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${
        isSelected
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
          : "border-white/10 bg-white/[0.02] hover:border-white/25"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2">
          {isWinner && (
            <span className="text-xs font-medium text-[var(--color-accent)]">✓ Winner</span>
          )}
          {isSelected && !isWinner && (
            <span className="text-xs font-medium text-[var(--color-fg)]">Selected</span>
          )}
        </span>
        <span className="text-xs tabular-nums text-[var(--color-muted)]">
          {(variant.conversionRate * 100).toFixed(1)}% conv.
        </span>
      </div>

      <VariantPreview dimension={dimension} variant={variant} />

      <div className="mt-2 flex justify-between text-[11px] text-[var(--color-muted)]">
        <span>{(variant.ctr * 100).toFixed(1)}% CTR</span>
        <span>{variant.ctaClicks} CTA clicks</span>
      </div>
    </button>
  );
}
