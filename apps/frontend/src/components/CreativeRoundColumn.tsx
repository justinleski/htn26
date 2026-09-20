import { motion } from "framer-motion";
import { CreativeVariantCard } from "@/components/CreativeVariantCard";
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

export function CreativeRoundColumn({
  round,
  onSelect,
}: {
  round: TestRound;
  onSelect: (variantId: string) => void;
}) {
  const winner = round.variants.find((v) => v.id === round.winnerId);
  const isOverridden = round.selectedId !== undefined && round.selectedId !== round.winnerId;

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      <div>
        <p className="text-xs font-medium tracking-wide text-[var(--color-accent)] uppercase">
          Round {round.round}
        </p>
        <h3 className="text-base font-semibold">{ROUND_TITLE[round.variedDimension]}</h3>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          {LOCKED_LABEL[round.variedDimension]}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {round.variants.map((variant) => (
          <CreativeVariantCard
            key={variant.id}
            dimension={round.variedDimension}
            variant={variant}
            isWinner={variant.id === round.winnerId}
            isSelected={variant.id === round.selectedId}
            onSelect={() => onSelect(variant.id)}
          />
        ))}
      </div>

      {winner && (
        <div className="min-h-11 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-xs leading-relaxed text-[var(--color-muted)]">
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
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent)]" />
              Explaining why it won...
            </span>
          )}
        </div>
      )}

      {isOverridden && (
        <p className="text-xs text-[var(--color-muted)]">
          Using your pick instead of the winner in the optimized ad →
        </p>
      )}
    </div>
  );
}
