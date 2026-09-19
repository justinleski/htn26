import { useEffect, useState } from "react";
import { generateTopInsight } from "@/contexts/data/insightService";
import { getMockEvidence } from "@/contexts/data/mockData";
import type { Insight } from "@/contexts/data/types";

export function useTopInsight() {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    generateTopInsight(getMockEvidence()).then((result) => {
      if (!cancelled) {
        setInsight(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { insight, loading };
}
