import type { Variant } from "@/contexts/data/types";

// Deterministic placeholder color per asset so each row/preview is visually
// distinct even without a real thumbnail image to load — there's no actual
// video/image file behind mediaAssetUrl in the mock data.
function hashHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function MediaPlaceholder({
  variant,
  size = "sm",
}: {
  variant: Pick<Variant, "mediaAssetUrl" | "mediaType">;
  size?: "sm" | "lg";
}) {
  const hue = hashHue(variant.mediaAssetUrl);
  const isVideo = variant.mediaType === "video";
  const gradient = `linear-gradient(135deg, hsl(${hue} 65% 90%), hsl(${hue} 60% 74%))`;

  if (size === "lg") {
    return (
      <div
        className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl"
        style={{ background: gradient }}
      >
        {isVideo ? (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-xl text-[var(--color-ink)] shadow-sm">
              ▶
            </span>
            {/* Mocked scrubber — no real video is playing, this is a still placeholder. */}
            <div className="absolute inset-x-4 bottom-3 h-1 rounded-full bg-white/40">
              <div className="h-full w-1/3 rounded-full bg-white/80" />
            </div>
          </>
        ) : (
          <span className="text-4xl" aria-hidden="true">
            🖼
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg"
      style={{ background: gradient }}
    >
      {isVideo ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/85 text-[9px] text-[var(--color-ink)]">
          ▶
        </span>
      ) : (
        <span className="text-base" aria-hidden="true">
          🖼
        </span>
      )}
    </div>
  );
}
