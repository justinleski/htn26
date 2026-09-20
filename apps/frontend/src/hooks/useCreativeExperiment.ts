import { useCallback, useEffect, useMemo, useState } from "react";
import { explainRoundWinner } from "@/contexts/data/creativeExplanationService";
import { pickRoundWinner } from "@/contexts/data/creativeTesting";
import type { CreativeExperiment, TestRound } from "@/contexts/data/types";

const WINNER_OF_THREE_PLACEHOLDER = "/mock/creative/winner-of-three-placeholder.png";

function pickForRound(round: TestRound | undefined, selectedId: string | undefined) {
  if (!round) return null;
  const selected = round.variants.find((v) => v.id === selectedId);
  return selected ?? pickRoundWinner(round.variants);
}

function buildFinalAd(
  rounds: TestRound[],
  selections: Record<number, string>,
): CreativeExperiment["finalAd"] | undefined {
  const captionRound = rounds.find((r) => r.variedDimension === "caption");
  const mediaRound = rounds.find((r) => r.variedDimension === "media");
  const hashtagsRound = rounds.find((r) => r.variedDimension === "hashtags");

  const captionVariant = pickForRound(captionRound, captionRound && selections[captionRound.round]);
  const mediaVariant = pickForRound(mediaRound, mediaRound && selections[mediaRound.round]);
  const hashtagsVariant = pickForRound(hashtagsRound, hashtagsRound && selections[hashtagsRound.round]);

  if (!captionVariant || !mediaVariant || !hashtagsVariant) return undefined;

  return {
    caption: captionVariant.caption,
    mediaAssetUrl:
      mediaVariant.mediaType === "video" ? WINNER_OF_THREE_PLACEHOLDER : mediaVariant.mediaAssetUrl,
    mediaType: mediaVariant.mediaType,
    hashtags: hashtagsVariant.hashtags,
  };
}

export function useCreativeExperiment(experiment: CreativeExperiment) {
  // Winners are picked synchronously the moment variant data exists — no AI involved.
  const rounds = useMemo<TestRound[]>(
    () =>
      experiment.rounds.map((round) => ({
        ...round,
        winnerId: pickRoundWinner(round.variants)?.id,
      })),
    [experiment],
  );

  // The variant currently feeding the final ad, per round. Defaults to that
  // round's winner but the merchant can override it by clicking any card —
  // mix-and-match across rounds without disturbing the underlying test data.
  const [selections, setSelections] = useState<Record<number, string>>({});

  useEffect(() => {
    setSelections((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const round of rounds) {
        if (round.winnerId && !(round.round in next)) {
          next[round.round] = round.winnerId;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [rounds]);

  const selectVariant = useCallback((round: number, variantId: string) => {
    setSelections((prev) => ({ ...prev, [round]: variantId }));
  }, []);

  const finalAd = useMemo(() => buildFinalAd(rounds, selections), [rounds, selections]);

  // whyItWon comes from the AI explanation call and always describes the
  // algorithmic winner, regardless of what the merchant has selected.
  const [explanations, setExplanations] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadExplanations() {
      for (const round of rounds) {
        if (!round.winnerId) continue;
        const explanation = await explainRoundWinner(
          round.variants,
          round.winnerId,
          round.variedDimension,
        );
        if (cancelled) return;
        setExplanations((prev) => ({ ...prev, [round.round]: explanation }));
      }
    }

    setExplanations({});
    loadExplanations();

    return () => {
      cancelled = true;
    };
  }, [rounds]);

  const enrichedRounds = useMemo(
    () =>
      rounds.map((round) => ({
        ...round,
        whyItWon: explanations[round.round],
        selectedId: selections[round.round] ?? round.winnerId,
      })),
    [rounds, explanations, selections],
  );

  return { rounds: enrichedRounds, finalAd, selectVariant };
}
