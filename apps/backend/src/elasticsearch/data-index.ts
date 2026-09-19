import type { AdPerformance, Product, Review } from "../schemas.js";

export const DATA_INDEX = "marketing-copilot-evidence-v1";

export const EVIDENCE_INDEX_MAPPINGS = {
  dynamic: true,
  properties: {
    id: { type: "keyword" },
    merchantId: { type: "keyword" },
    recordType: { type: "keyword" },
    sourceRecordId: { type: "keyword" },
    productId: { type: "keyword" },
    shopifyId: { type: "keyword" },
    campaignId: { type: "keyword" },
    sourceId: { type: "keyword" },
    source: { type: "keyword" },
    attribution: { type: "keyword" },
    channel: { type: "keyword" },
    currency: { type: "keyword" },
    title: { type: "text" },
    description: { type: "text" },
    text: { type: "text" },
    messaging: { type: "text" },
    reviewedAt: { type: "date" },
    periodStart: { type: "date" },
    periodEnd: { type: "date" },
    createdAt: { type: "date" },
    updatedAt: { type: "date" },
    rating: { type: "integer" },
    price: { type: "double" },
    impressions: { type: "long" },
    clicks: { type: "long" },
    purchases: { type: "long" },
    spend: { type: "double" },
    attributedRevenue: { type: "double" },
    attributes: { type: "object", dynamic: true },
  },
} as const;

export interface ElasticBulkResponse {
  errors: boolean;
  items?: Array<Record<string, { error?: { reason?: string } }>>;
}

export interface ElasticSearchResponse<T> {
  hits: {
    hits: Array<{ _id: string; _score?: number; _source: T }>;
  };
}

export interface ElasticDataClient {
  bulk(request: { refresh: "wait_for"; operations: unknown[] }): Promise<ElasticBulkResponse>;
  search<T>(request: Record<string, unknown>): Promise<ElasticSearchResponse<T>>;
}

export interface ElasticIndexAdminClient {
  indices: {
    exists(request: { index: string }): Promise<boolean>;
    create(request: { index: string; mappings: typeof EVIDENCE_INDEX_MAPPINGS }): Promise<unknown>;
  };
}

function isAlreadyExistsError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const serialized = error instanceof Error ? `${error.message} ${JSON.stringify(error)}` : JSON.stringify(error);
  return serialized.includes("resource_already_exists_exception");
}

export async function ensureEvidenceIndex(
  client: ElasticIndexAdminClient,
): Promise<{ created: boolean }> {
  if (await client.indices.exists({ index: DATA_INDEX })) return { created: false };
  try {
    await client.indices.create({ index: DATA_INDEX, mappings: EVIDENCE_INDEX_MAPPINGS });
    return { created: true };
  } catch (error) {
    if (isAlreadyExistsError(error)) return { created: false };
    throw error;
  }
}

export type EvidenceDocument =
  | ({ recordType: "product"; sourceRecordId: string } & Product)
  | ({ recordType: "review"; sourceRecordId: string } & Review)
  | ({ recordType: "ad"; sourceRecordId: string } & AdPerformance);

export function toEvidenceDocument(record: Product | Review | AdPerformance): EvidenceDocument {
  if ("shopifyId" in record) {
    return { ...record, recordType: "product", sourceRecordId: record.shopifyId };
  }
  if ("rating" in record) {
    return { ...record, recordType: "review", sourceRecordId: record.sourceId };
  }
  return { ...record, recordType: "ad", sourceRecordId: record.sourceId };
}

export async function indexEvidence(
  client: ElasticDataClient,
  records: Array<Product | Review | AdPerformance>,
): Promise<{ indexed: number }> {
  if (records.length === 0) return { indexed: 0 };
  const documents = records.map(toEvidenceDocument);
  const operations = documents.flatMap((document) => [
    {
      index: {
        _index: DATA_INDEX,
        _id: `${document.merchantId}:${document.recordType}:${document.sourceRecordId}`,
      },
    },
    document,
  ]);

  const response = await client.bulk({ refresh: "wait_for", operations });
  if (response.errors) {
    const reasons = response.items
      ?.flatMap((item) => Object.values(item))
      .map((item) => item.error?.reason)
      .filter((reason): reason is string => Boolean(reason));
    throw new Error(`Elasticsearch bulk index failed${reasons?.length ? `: ${reasons.join("; ")}` : ""}`);
  }
  return { indexed: documents.length };
}

export async function searchEvidence(options: {
  client: ElasticDataClient;
  merchantId: string;
  query: string;
  productId?: string;
  recordTypes?: Array<EvidenceDocument["recordType"]>;
  size?: number;
}): Promise<EvidenceDocument[]> {
  if (!options.merchantId.trim()) throw new Error("merchantId is required");
  const filters: unknown[] = [{ term: { merchantId: options.merchantId } }];
  if (options.productId) filters.push({ term: { productId: options.productId } });
  if (options.recordTypes?.length) filters.push({ terms: { recordType: options.recordTypes } });

  const response = await options.client.search<EvidenceDocument>({
    index: DATA_INDEX,
    size: options.size ?? 20,
    query: {
      bool: {
        filter: filters,
        must: options.query.trim()
          ? [
              {
                multi_match: {
                  query: options.query,
                  fields: ["title^3", "description", "text^2", "messaging^2", "attributes.*"],
                },
              },
            ]
          : [{ match_all: {} }],
      },
    },
  });
  return response.hits.hits.map((hit) => hit._source);
}
