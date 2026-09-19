import {
  indexEvidence,
  type ElasticDataClient,
} from "../elasticsearch/data-index.js";
import {
  importAdPerformance,
  importReviews,
  type AdPerformanceUpsert,
  type DataImportRepository,
  type ImportFormat,
  type ImportResult,
  type ReviewUpsert,
} from "../import/importer.js";
import type { AdPerformance, Attribution, Review } from "../schemas.js";

export interface ImportAndIndexResult<T> {
  imported: ImportResult<T>;
  indexed: number;
}

function reviewEvidence(record: ReviewUpsert): Review {
  return { id: record.sourceId, ...record };
}

function adEvidence(record: AdPerformanceUpsert): AdPerformance {
  return { id: record.sourceId, ...record };
}

export async function importReviewsAndIndex(options: {
  merchantId: string;
  input: string;
  format: ImportFormat;
  attribution: Attribution;
  repository: DataImportRepository;
  elastic: ElasticDataClient;
}): Promise<ImportAndIndexResult<ReviewUpsert>> {
  const imported = await importReviews(options);
  const indexed = await indexEvidence(options.elastic, imported.records.map(reviewEvidence));
  return { imported, indexed: indexed.indexed };
}

export async function importAdPerformanceAndIndex(options: {
  merchantId: string;
  input: string;
  format: ImportFormat;
  attribution: Attribution;
  repository: DataImportRepository;
  elastic: ElasticDataClient;
}): Promise<ImportAndIndexResult<AdPerformanceUpsert>> {
  const imported = await importAdPerformance(options);
  const indexed = await indexEvidence(options.elastic, imported.records.map(adEvidence));
  return { imported, indexed: indexed.indexed };
}
