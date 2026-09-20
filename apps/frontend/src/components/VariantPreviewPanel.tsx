import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { MediaPlaceholder } from "@/components/MediaPlaceholder";
import type { Variant } from "@/contexts/data/types";

function Stat({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium tracking-wide text-[var(--color-ink-muted)] uppercase">
        {label}
      </p>
      <p
        className={`font-mono-num mt-0.5 ${emphasize ? "text-2xl font-semibold" : "text-base font-medium"}`}
      >
        {value}
      </p>
    </div>
  );
}

// Rendered via a portal into document.body — this page's ancestor tree has
// framer-motion elements with an active transform, which would otherwise
// turn `position: fixed` into "fixed to that ancestor" instead of the
// viewport. Modeled loosely on Hootsuite's composer-plus-analytics split:
// post preview on the left, performance stats on the right.
export function VariantPreviewPanel({
  variant,
  isSelected,
  whyItWon,
  onSelect,
  onClose,
}: {
  variant: Variant;
  isSelected: boolean;
  whyItWon?: string;
  onSelect: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
        aria-label="Variant details"
        onClick={(e) => e.stopPropagation()}
        className="paper relative w-full max-w-2xl overflow-hidden rounded-2xl"
      >
        <motion.button
          type="button"
          onClick={onClose}
          aria-label="Close"
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.05 }}
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-paper-dim)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          ✕
        </motion.button>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div className="flex flex-col gap-3 border-b border-[var(--color-ink)]/10 p-5 sm:border-r sm:border-b-0">
            <p className="text-xs font-medium tracking-wide text-[var(--color-ink-muted)] uppercase">
              Post preview
            </p>
            <MediaPlaceholder variant={variant} size="lg" />
            <div>
              <p className="text-[10px] font-medium tracking-wide text-[var(--color-ink-muted)] uppercase">
                {variant.captionTheme}
              </p>
              <p className="mt-1 text-sm leading-relaxed">{variant.caption}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {variant.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono-num rounded-lg border border-[var(--color-ink)]/15 bg-[var(--color-paper-dim)] px-2 py-1 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 p-5">
            <div>
              <p className="text-xs font-medium tracking-wide text-[var(--color-ink-muted)] uppercase">
                Performance
              </p>
              {isSelected && (
                <p className="mt-1 text-xs font-medium text-[var(--color-ink)]">
                  Currently selected
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Stat
                label="Conversion rate"
                value={`${(variant.conversionRate * 100).toFixed(1)}%`}
                emphasize
              />
              <Stat label="CTR" value={`${(variant.ctr * 100).toFixed(1)}%`} />
              <Stat label="CTA clicks" value={variant.ctaClicks.toLocaleString()} />
            </div>

            {whyItWon && (
              <p className="rounded-xl bg-[var(--color-paper-dim)] p-3 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                {whyItWon}
              </p>
            )}

            <motion.button
              type="button"
              onClick={() => {
                onSelect();
                onClose();
              }}
              whileTap={{ scale: 0.96 }}
              className="mt-auto rounded-full bg-[var(--color-mark)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-mark-hover)]"
            >
              {isSelected ? "Keep using this variant" : "Use in optimized ad"}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
