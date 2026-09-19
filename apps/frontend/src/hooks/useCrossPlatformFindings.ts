import { useEffect, useMemo, useState } from "react";
import { generateCrossPlatformFindings } from "@/contexts/data/crossPlatformInsightService";
import { getPlatformSpreadFlag } from "@/contexts/data/metrics";
import type { AdPerformance, CrossPlatformFinding, Product } from "@/contexts/data/types";

export function useCrossPlatformFindings(ads: AdPerformance[], products: Product[]) {
  const [broadAppeal, setBroadAppeal] = useState<CrossPlatformFinding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    generateCrossPlatformFindings(ads, products).then((result) => {
      if (!cancelled) {
        setBroadAppeal(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ads, products]);

  // Plain comparison, no AI needed — the opposite signal from broad appeal.
  const platformGaps = useMemo(() => {
    const productById = new Map(products.map((p) => [p.id, p]));

    return ads
      .map((ad): CrossPlatformFinding | null => {
        const flag = getPlatformSpreadFlag(ad);
        if (!flag) return null;

        const productName = productById.get(ad.productId)?.title ?? ad.name;
        return {
          id: `platform-gap-${ad.id}`,
          adId: ad.id,
          kind: "platform-gap",
          headline: `"${ad.name}" has a big gap between platforms`,
          explanation: `${flag.message} (${productName})`,
          platforms: [flag.best.platform, flag.worst.platform],
        };
      })
      .filter((finding): finding is CrossPlatformFinding => finding !== null);
  }, [ads, products]);

  return { broadAppeal, platformGaps, loading };
}
