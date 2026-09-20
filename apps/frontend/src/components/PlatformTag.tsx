import type { Platform } from "@/contexts/data/types";

// Meta owns Facebook, hence the token name — kept mapped here so callers
// just say "Facebook" and get the right dot color.
export const PLATFORM_COLOR_VAR: Record<Platform, string> = {
  Instagram: "var(--color-instagram)",
  Facebook: "var(--color-meta)",
  Google: "var(--color-google)",
  TikTok: "var(--color-tiktok)",
};

export function PlatformTag({
  platform,
  className = "",
}: {
  platform: Platform;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: PLATFORM_COLOR_VAR[platform] }}
        aria-hidden="true"
      />
      {platform}
    </span>
  );
}
