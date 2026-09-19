import { groupAdMetrics, type MetricGroup } from "../metrics/index.js";
import type { AdPerformance } from "../schemas.js";

export interface AdPerformanceReader {
  listAdPerformance(options: { merchantId: string; productId?: string }): Promise<AdPerformance[]>;
}

export interface DashboardMetrics {
  hasData: boolean;
  adCount: number;
  groups: MetricGroup[];
}

export async function getDashboardMetrics(options: {
  merchantId: string;
  productId?: string;
  repository: AdPerformanceReader;
}): Promise<DashboardMetrics> {
  if (!options.merchantId.trim()) throw new Error("merchantId is required");

  const ads = await options.repository.listAdPerformance({
    merchantId: options.merchantId,
    ...(options.productId ? { productId: options.productId } : {}),
  });

  return {
    hasData: ads.length > 0,
    adCount: ads.length,
    groups: groupAdMetrics(ads),
  };
}
