import assert from "node:assert/strict";
import test from "node:test";
import {
  indexEvidence,
  searchEvidence,
  type ElasticDataClient,
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
