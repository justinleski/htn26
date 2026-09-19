import { indexEvidence, type ElasticDataClient } from "../elasticsearch/data-index.js";
import type { AdPerformance, Product, Review } from "../schemas.js";

export interface MerchantEvidenceReader {
  listProducts(options: { merchantId: string }): Promise<Product[]>;
  listReviews(options: { merchantId: string }): Promise<Review[]>;
  listAdPerformance(options: { merchantId: string; productId?: string }): Promise<AdPerformance[]>;
}

export async function reindexMerchantEvidence(options: {
  merchantId: string;
  repository: MerchantEvidenceReader;
  elastic: ElasticDataClient;
  batchSize?: number;
}): Promise<{ indexed: number; batches: number }> {
  if (!options.merchantId.trim()) throw new Error("merchantId is required");
  const batchSize = options.batchSize ?? 250;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1_000) {
    throw new Error("batchSize must be an integer between 1 and 1000");
  }

  const [products, reviews, ads] = await Promise.all([
    options.repository.listProducts({ merchantId: options.merchantId }),
    options.repository.listReviews({ merchantId: options.merchantId }),
    options.repository.listAdPerformance({ merchantId: options.merchantId }),
  ]);
  const records: Array<Product | Review | AdPerformance> = [...products, ...reviews, ...ads];
  const crossMerchantRecord = records.find((record) => record.merchantId !== options.merchantId);
  if (crossMerchantRecord) {
    throw new Error(`Repository returned evidence for unexpected merchant ${crossMerchantRecord.merchantId}`);
  }

  let indexed = 0;
  let batches = 0;
  for (let offset = 0; offset < records.length; offset += batchSize) {
    const result = await indexEvidence(options.elastic, records.slice(offset, offset + batchSize));
    indexed += result.indexed;
    batches += 1;
  }
  return { indexed, batches };
}
