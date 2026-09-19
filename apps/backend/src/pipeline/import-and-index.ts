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
  type ImportLimits,
  type ImportResult,
  type ReviewUpsert,
} from "../import/importer.js";
import type { AdPerformance, Attribution, Review } from "../schemas.js";
import { IndexingAfterPersistenceError } from "./errors.js";

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
  limits?: ImportLimits;
}): Promise<ImportAndIndexResult<ReviewUpsert>> {
  const imported = await importReviews(options);
  try {
    const indexed = await indexEvidence(options.elastic, imported.records.map(reviewEvidence));
    return { imported, indexed: indexed.indexed };
  } catch (error) {
    throw new IndexingAfterPersistenceError("review", imported.unique, error);
  }
}

export async function importAdPerformanceAndIndex(options: {
  merchantId: string;
  input: string;
  format: ImportFormat;
  attribution: Attribution;
  repository: DataImportRepository;
  elastic: ElasticDataClient;
  limits?: ImportLimits;
}): Promise<ImportAndIndexResult<AdPerformanceUpsert>> {
  const imported = await importAdPerformance(options);
  try {
    const indexed = await indexEvidence(options.elastic, imported.records.map(adEvidence));
    return { imported, indexed: indexed.indexed };
  } catch (error) {
    throw new IndexingAfterPersistenceError("ad", imported.unique, error);
  }
}
