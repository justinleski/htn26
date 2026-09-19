import type { AdPerformance, Product, Review } from "../schemas.js";

export const DATA_INDEX = "marketing-copilot-evidence-v1";

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
