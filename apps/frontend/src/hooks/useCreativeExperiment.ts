import { useEffect, useMemo, useState } from "react";
import { explainRoundWinner } from "@/contexts/data/creativeExplanationService";
import { pickRoundWinner } from "@/contexts/data/creativeTesting";
import type { CreativeExperiment, TestRound } from "@/contexts/data/types";

function buildFinalAd(rounds: TestRound[]): CreativeExperiment["finalAd"] | undefined {
  const captionRound = rounds.find((r) => r.variedDimension === "caption");
  const mediaRound = rounds.find((r) => r.variedDimension === "media");
  const hashtagsRound = rounds.find((r) => r.variedDimension === "hashtags");

  const captionWinner = captionRound && pickRoundWinner(captionRound.variants);
  const mediaWinner = mediaRound && pickRoundWinner(mediaRound.variants);
  const hashtagsWinner = hashtagsRound && pickRoundWinner(hashtagsRound.variants);

  if (!captionWinner || !mediaWinner || !hashtagsWinner) return undefined;

  return {
    caption: captionWinner.caption,
    mediaAssetUrl: mediaWinner.mediaAssetUrl,
    hashtags: hashtagsWinner.hashtags,
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

  const finalAd = useMemo(() => buildFinalAd(rounds), [rounds]);

  // whyItWon comes from the AI explanation call; fetched sequentially per
  // round so the funnel reads as each round locking in before the next.
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
    () => rounds.map((round) => ({ ...round, whyItWon: explanations[round.round] })),
    [rounds, explanations],
  );

  return { rounds: enrichedRounds, finalAd };
}
