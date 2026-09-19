import { createHash } from "node:crypto";
import type { z } from "zod";
import type { AdPerformance, Attribution, Review } from "../schemas.js";
import { parseCsv } from "./csv.js";
import {
  AdPerformanceImportRowSchema,
  ReviewImportRowSchema,
  type AdPerformanceImportRow,
  type ReviewImportRow,
} from "./schemas.js";

export type ImportFormat = "csv" | "json";
export type ReviewUpsert = Omit<Review, "id">;
export type AdPerformanceUpsert = Omit<AdPerformance, "id">;

export interface DataImportRepository {
  upsertReviews(records: ReviewUpsert[]): Promise<void>;
  upsertAdPerformance(records: AdPerformanceUpsert[]): Promise<void>;
}

export interface ImportResult {
  processed: number;
  unique: number;
  duplicateRows: number;
}

export class DataImportError extends Error {
  constructor(readonly errors: string[]) {
    super(`Import validation failed:\n${errors.join("\n")}`);
    this.name = "DataImportError";
  }
}

function jsonRows(input: string, collectionName: "reviews" | "ads"): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (error) {
    throw new DataImportError([`Invalid JSON: ${error instanceof Error ? error.message : "unknown parse error"}`]);
  }

  const rows = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)[collectionName]
      : undefined;

  if (!Array.isArray(rows)) {
    throw new DataImportError([`JSON must be an array or an object containing a '${collectionName}' array`]);
  }
  return rows;
}

function inputRows(input: string, format: ImportFormat, collectionName: "reviews" | "ads"): unknown[] {
  return format === "csv" ? parseCsv(input) : jsonRows(input, collectionName);
}

function validateRows<T>(rows: unknown[], schema: z.ZodType<T>): T[] {
  const valid: T[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const result = schema.safeParse(row);
    if (result.success) {
      valid.push(result.data);
      return;
    }

    for (const issue of result.error.issues) {
      const field = issue.path.length > 0 ? `.${issue.path.join(".")}` : "";
      errors.push(`row ${index + 1}${field}: ${issue.message}`);
    }
  });

  if (errors.length > 0) throw new DataImportError(errors);
  return valid;
}

function stableSourceId(prefix: string, value: object): string {
  const hash = createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24);
  return `${prefix}_${hash}`;
}

function uniqueBySourceId<T extends { sourceId: string }>(records: T[]): T[] {
  return [...new Map(records.map((record) => [record.sourceId, record])).values()];
}

export function parseReviewRows(input: string, format: ImportFormat): ReviewImportRow[] {
  return validateRows(inputRows(input, format, "reviews"), ReviewImportRowSchema);
}

export function parseAdPerformanceRows(input: string, format: ImportFormat): AdPerformanceImportRow[] {
  return validateRows(inputRows(input, format, "ads"), AdPerformanceImportRowSchema);
}

export async function importReviews(options: {
  merchantId: string;
  input: string;
  format: ImportFormat;
  attribution: Attribution;
  repository: DataImportRepository;
}): Promise<ImportResult> {
  const rows = parseReviewRows(options.input, options.format);
  const records = uniqueBySourceId(
    rows.map((row) => ({
      merchantId: options.merchantId,
      sourceId: row.sourceId ?? stableSourceId("review", row),
      productId: row.productId,
      rating: row.rating,
      text: row.text,
      source: row.source,
      reviewedAt: row.reviewedAt,
      attribution: options.attribution,
    })),
  );
  await options.repository.upsertReviews(records);
  return { processed: rows.length, unique: records.length, duplicateRows: rows.length - records.length };
}

export async function importAdPerformance(options: {
  merchantId: string;
  input: string;
  format: ImportFormat;
  attribution: Attribution;
  repository: DataImportRepository;
}): Promise<ImportResult> {
  const rows = parseAdPerformanceRows(options.input, options.format);
  const records = uniqueBySourceId(
    rows.map((row) => ({
      merchantId: options.merchantId,
      sourceId: row.sourceId ?? stableSourceId("ad", row),
      productId: row.productId,
      campaignId: row.campaignId,
      messaging: row.messaging,
      channel: row.channel,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      impressions: row.impressions,
      clicks: row.clicks,
      purchases: row.purchases,
      spend: row.spend,
      attributedRevenue: row.attributedRevenue,
      currency: row.currency,
      source: row.source,
      attribution: options.attribution,
    })),
  );
  await options.repository.upsertAdPerformance(records);
  return { processed: rows.length, unique: records.length, duplicateRows: rows.length - records.length };
}
