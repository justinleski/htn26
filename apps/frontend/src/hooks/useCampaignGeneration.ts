import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAMPAIGN_GENERATION_STATUS_LINES,
  generateCampaign,
} from "@/contexts/data/campaignService";
import type { CampaignVariant, Insight, Product } from "@/contexts/data/types";

type Status = "generating" | "done" | "error";

export function useCampaignGeneration(product: Product | null, insight: Insight | null) {
  const [status, setStatus] = useState<Status>("generating");
  const [statusLineIndex, setStatusLineIndex] = useState(0);
  const [variants, setVariants] = useState<CampaignVariant[]>([]);
  const [runId, setRunId] = useState(0);
  const requestId = useRef(0);

  const run = useCallback(() => {
    if (!product || !insight) return;

    const id = ++requestId.current;
    setStatus("generating");
    setStatusLineIndex(0);
    setRunId((n) => n + 1);

    generateCampaign({ product, insight })
      .then((result) => {
        if (requestId.current !== id) return;
        setVariants(result);
        setStatus("done");
      })
      .catch(() => {
        if (requestId.current !== id) return;
        setStatus("error");
      });
  }, [product, insight]);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, insight?.id]);

  useEffect(() => {
    if (status !== "generating") return;
    const interval = setInterval(() => {
      setStatusLineIndex((i) => (i + 1) % CAMPAIGN_GENERATION_STATUS_LINES.length);
    }, 700);
    return () => clearInterval(interval);
  }, [status]);

  return {
    status,
    statusLine: CAMPAIGN_GENERATION_STATUS_LINES[statusLineIndex],
    variants,
    runId,
    regenerate: run,
  };
}
