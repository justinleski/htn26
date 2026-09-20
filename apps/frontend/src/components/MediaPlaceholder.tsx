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

const WINNER_OF_THREE_PLACEHOLDER = "/mock/creative/winner-of-three-placeholder.png";

function PlayOverlay({ size }: { size: "sm" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute flex items-center justify-center rounded-full bg-white/90 text-[var(--color-ink)] shadow-sm ${
        size === "lg" ? "h-14 w-14 text-xl" : "h-5 w-5 text-[9px]"
      }`}
    >
      ▶
    </span>
  );
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
  const isWinnerPlaceholder = variant.mediaAssetUrl === WINNER_OF_THREE_PLACEHOLDER;

  if (isWinnerPlaceholder) {
    if (size === "lg") {
      return (
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-white p-2">
          <img
            src={variant.mediaAssetUrl}
            alt="Winner of three product thumbnail"
            className="h-full w-full rounded-lg object-contain bg-white"
          />
          {isVideo ? <PlayOverlay size="lg" /> : null}
        </div>
      );
    }

    return (
      <div className="relative flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
        <img
          src={variant.mediaAssetUrl}
          alt="Winner of three product thumbnail"
          className="h-full w-full rounded-md object-contain bg-white"
        />
        {isVideo ? <PlayOverlay size="sm" /> : null}
      </div>
    );
  }

  if (size === "lg") {
    return (
      <div
        className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl"
        style={{ background: gradient }}
      >
        {isVideo ? (
          <>
            <PlayOverlay size="lg" />
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
        <PlayOverlay size="sm" />
      ) : (
        <span className="text-base" aria-hidden="true">
          🖼
        </span>
      )}
    </div>
  );
}
