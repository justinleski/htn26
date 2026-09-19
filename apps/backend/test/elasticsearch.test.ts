import assert from "node:assert/strict";
import test from "node:test";
import {
  DATA_INDEX,
  EVIDENCE_INDEX_MAPPINGS,
  ensureEvidenceIndex,
  indexEvidence,
  searchEvidence,
  type ElasticDataClient,
  type ElasticIndexAdminClient,
  type ElasticSearchResponse,
  type EvidenceDocument,
} from "../src/elasticsearch/data-index.js";
import type { Review } from "../src/schemas.js";

test("search always includes a merchant filter", async () => {
  let request: Record<string, unknown> | undefined;
  const client: ElasticDataClient = {
    async bulk() {
      return { errors: false };
    },
    async search<T>(received: Record<string, unknown>): Promise<ElasticSearchResponse<T>> {
      request = received;
      return { hits: { hits: [] } };
    },
  };

  await searchEvidence({ client, merchantId: "merchant-1", query: "waterproof", productId: "rain-jacket" });
  const serialized = JSON.stringify(request);
  assert.match(serialized, /"merchantId":"merchant-1"/);
  assert.match(serialized, /"productId":"rain-jacket"/);
});

test("index IDs are namespaced by merchant, record type, and source ID", async () => {
  let operations: unknown[] = [];
  const client: ElasticDataClient = {
    async bulk(request) {
      operations = request.operations;
      return { errors: false };
    },
    async search<T>(): Promise<ElasticSearchResponse<T>> {
      return { hits: { hits: [] } };
    },
  };
  const review: Review = {
    id: "review-db-id",
    merchantId: "merchant-1",
    sourceId: "review-source-id",
    productId: "rain-jacket",
    rating: 5,
    text: "Dry all day",
    source: "test",
    reviewedAt: "2026-08-01T00:00:00.000Z",
    attribution: "imported",
  };

  await indexEvidence(client, [review]);
  assert.equal((operations[0] as { index: { _id: string } }).index._id, "merchant-1:review:review-source-id");
  assert.equal((operations[1] as EvidenceDocument).merchantId, "merchant-1");
});

test("index bootstrap creates the evidence index with explicit mappings", async () => {
  let created: Parameters<ElasticIndexAdminClient["indices"]["create"]>[0] | undefined;
  const client: ElasticIndexAdminClient = {
    indices: {
      async exists() {
        return false;
      },
      async create(request) {
        created = request;
        return {};
      },
    },
  };

  assert.deepEqual(await ensureEvidenceIndex(client), { created: true });
  assert.equal(created?.index, DATA_INDEX);
  assert.equal(created?.mappings, EVIDENCE_INDEX_MAPPINGS);
  assert.equal(created?.mappings.properties.merchantId.type, "keyword");
  assert.equal(created?.mappings.properties.reviewedAt.type, "date");
});

test("index bootstrap is idempotent when the index already exists", async () => {
  let creates = 0;
  const client: ElasticIndexAdminClient = {
    indices: {
      async exists() {
        return true;
      },
      async create() {
        creates += 1;
        return {};
      },
    },
  };

  assert.deepEqual(await ensureEvidenceIndex(client), { created: false });
  assert.equal(creates, 0);
});

test("bulk item failures surface their Elasticsearch reason", async () => {
  const client: ElasticDataClient = {
    async bulk() {
      return {
        errors: true,
        items: [{ index: { error: { reason: "mapper rejected field" } } }],
      };
    },
    async search<T>(): Promise<ElasticSearchResponse<T>> {
      return { hits: { hits: [] } };
    },
  };
  const review: Review = {
    id: "review-db-id",
    merchantId: "merchant-1",
    sourceId: "review-source-id",
    productId: "rain-jacket",
    rating: 5,
    text: "Dry all day",
    source: "test",
    reviewedAt: "2026-08-01T00:00:00.000Z",
    attribution: "imported",
  };

  await assert.rejects(() => indexEvidence(client, [review]), /mapper rejected field/);
});
