import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CreativeVariantCard } from "@/components/CreativeVariantCard";
import { VariantPreviewPanel } from "@/components/VariantPreviewPanel";
import {
  sortVariantsByMetric,
  type CreativeSortColumn,
} from "@/contexts/data/creativeTesting";
import type { TestRound } from "@/contexts/data/types";

const ROUND_TITLE: Record<TestRound["variedDimension"], string> = {
  caption: "Caption test",
  media: "Media test",
  hashtags: "Hashtag test",
};

const LOCKED_LABEL: Record<TestRound["variedDimension"], string> = {
  caption: "Media + hashtags held constant",
  media: "Caption + hashtags held constant",
  hashtags: "Caption + media held constant",
};

const PREVIEW_COLUMN_LABEL: Record<TestRound["variedDimension"], string> = {
  caption: "Caption",
  media: "Media",
  hashtags: "Hashtags",
};

function SortHeaderButton({
  label,
  column,
  sort,
  onClick,
}: {
  label: string;
  column: CreativeSortColumn;
  sort: { column: CreativeSortColumn; direction: "asc" | "desc" };
  onClick: () => void;
}) {
  const isActive = sort.column === column;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      className={`flex items-center justify-end gap-0.5 text-right transition-colors ${
        isActive ? "text-[var(--color-ink)]" : "hover:text-[var(--color-ink)]"
      }`}
    >
      {label}
      <motion.span
        animate={{ rotate: isActive && sort.direction === "asc" ? 180 : 0 }}
        transition={{ duration: 0.2 }}
        className="w-2.5 text-[8px]"
      >
        {isActive ? "▼" : ""}
      </motion.span>
    </motion.button>
  );
}

export function CreativeRoundColumn({
  round,
  onSelect,
}: {
  round: TestRound;
  onSelect: (variantId: string) => void;
}) {
  const [sort, setSort] = useState<{ column: CreativeSortColumn; direction: "asc" | "desc" }>({
    column: "conversionRate",
    direction: "desc",
  });
  const [previewVariantId, setPreviewVariantId] = useState<string | null>(null);

  const winner = round.variants.find((v) => v.id === round.winnerId);
  const isOverridden = round.selectedId !== undefined && round.selectedId !== round.winnerId;
  const sortedVariants = sortVariantsByMetric(round.variants, sort.column, sort.direction);
  const previewVariant = round.variants.find((v) => v.id === previewVariantId);

  function handleHeaderClick(column: CreativeSortColumn) {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "desc" ? "asc" : "desc" }
        : { column, direction: "desc" },
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <p className="text-xs font-medium tracking-wide text-[var(--color-ink-on-dark)]/70 uppercase">
          Round {round.round}
        </p>
        <h3 className="font-display text-base font-semibold">
          {ROUND_TITLE[round.variedDimension]}
        </h3>
        <p className="mt-0.5 text-xs text-[var(--color-ink-on-dark)]/55">
          {LOCKED_LABEL[round.variedDimension]}
        </p>
      </div>

      <div className="paper overflow-hidden rounded-2xl">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 border-b border-[var(--color-ink)]/10 bg-[var(--color-paper-dim)] px-3 py-2 text-[11px] font-medium tracking-wide text-[var(--color-ink-muted)] uppercase">
          <span aria-hidden="true" />
          <span>{PREVIEW_COLUMN_LABEL[round.variedDimension]}</span>
          <SortHeaderButton
            label="CTR"
            column="ctr"
            sort={sort}
            onClick={() => handleHeaderClick("ctr")}
          />
          <SortHeaderButton
            label="Conv."
            column="conversionRate"
            sort={sort}
            onClick={() => handleHeaderClick("conversionRate")}
          />
          <SortHeaderButton
            label="Clicks"
            column="ctaClicks"
            sort={sort}
            onClick={() => handleHeaderClick("ctaClicks")}
          />
          <span aria-hidden="true" />
        </div>
        <ul>
          {sortedVariants.map((variant) => (
            <CreativeVariantCard
              key={variant.id}
              dimension={round.variedDimension}
              variant={variant}
              isSelected={variant.id === round.selectedId}
              onSelect={() => onSelect(variant.id)}
              onOpenPreview={() => setPreviewVariantId(variant.id)}
            />
          ))}
        </ul>
      </div>

      {winner && (
        <div className="paper min-h-11 rounded-xl p-2.5 text-xs leading-relaxed text-[var(--color-ink-muted)]">
          {round.whyItWon ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {round.whyItWon}
            </motion.p>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-mark)]" />
              Analyzing this round's results...
            </span>
          )}
        </div>
      )}

      {isOverridden && (
        <p className="text-xs text-[var(--color-ink-on-dark)]/55">
          Using your pick instead of the default for the optimized ad →
        </p>
      )}

      <AnimatePresence>
        {previewVariant && (
          <VariantPreviewPanel
            key={previewVariant.id}
            variant={previewVariant}
            isSelected={previewVariant.id === round.selectedId}
            whyItWon={previewVariant.id === round.winnerId ? round.whyItWon : undefined}
            onSelect={() => onSelect(previewVariant.id)}
            onClose={() => setPreviewVariantId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
