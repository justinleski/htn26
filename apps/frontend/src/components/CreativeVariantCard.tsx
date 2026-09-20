import { useState } from "react";
import { motion } from "framer-motion";
import { MediaPlaceholder } from "@/components/MediaPlaceholder";
import type { CreativeDimension, Variant } from "@/contexts/data/types";

function fileName(url: string) {
  return url.split("/").pop() ?? url;
}

function EyeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SelectionIndicator({ selected }: { selected: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      animate={{ scale: selected ? [0.7, 1.1, 1] : 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
        selected
          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
          : "border-[var(--color-ink)]/20 text-transparent"
      }`}
    >
      <CheckIcon />
    </motion.span>
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
    return (
      <span className="flex min-w-0 items-center gap-2.5">
        <MediaPlaceholder variant={variant} />
        <span className="min-w-0 text-xs text-[var(--color-ink-muted)] capitalize">
          {variant.mediaType} · {fileName(variant.mediaAssetUrl)}
        </span>
      </span>
    );
  }

  if (dimension === "hashtags") {
    return (
      <span className="flex min-w-0 flex-wrap gap-1">
        {variant.hashtags.map((tag) => (
          <span
            key={tag}
            className="font-mono-num rounded-md border border-[var(--color-ink)]/15 bg-[var(--color-paper-dim)] px-1.5 py-0.5 text-[11px]"
          >
            {tag}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className="block min-w-0">
      <span className="block text-[10px] font-medium tracking-wide text-[var(--color-ink-muted)] uppercase">
        {variant.captionTheme}
      </span>
      <span className="mt-0.5 block text-sm leading-snug">{variant.caption}</span>
    </span>
  );
}

export function CreativeVariantCard({
  dimension,
  variant,
  isSelected,
  onSelect,
  onOpenPreview,
}: {
  dimension: CreativeDimension;
  variant: Variant;
  isSelected: boolean;
  onSelect: () => void;
  onOpenPreview: () => void;
}) {
  const [justOpened, setJustOpened] = useState(false);

  return (
    <li className="border-b border-[var(--color-ink)]/8 last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className={`grid w-full cursor-pointer grid-cols-[auto_1fr_auto_auto_auto_auto] items-start gap-x-3 px-3 py-3 text-left transition-colors hover:bg-[var(--color-ink)]/[0.03] ${
          isSelected ? "bg-[var(--color-mark)]/8" : ""
        }`}
      >
        <SelectionIndicator selected={isSelected} />
        <VariantPreview dimension={dimension} variant={variant} />
        <span className="font-mono-num pt-0.5 text-right text-xs">
          {(variant.ctr * 100).toFixed(1)}%
        </span>
        <span className="font-mono-num pt-0.5 text-right text-xs font-medium">
          {(variant.conversionRate * 100).toFixed(1)}%
        </span>
        <span className="font-mono-num pt-0.5 text-right text-xs text-[var(--color-ink-muted)]">
          {variant.ctaClicks}
        </span>
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setJustOpened(true);
            setTimeout(() => setJustOpened(false), 300);
            onOpenPreview();
          }}
          aria-label="View full details"
          whileTap={{ scale: 0.8 }}
          animate={{
            scale: justOpened ? [1, 1.3, 1] : 1,
            backgroundColor: justOpened ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0)",
            color: justOpened ? "var(--color-ink)" : "var(--color-ink-muted)",
          }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-ink)]/10 hover:text-[var(--color-ink)]"
        >
          <EyeIcon />
        </motion.button>
      </div>
    </li>
  );
}
