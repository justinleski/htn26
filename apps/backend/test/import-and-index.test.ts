import assert from "node:assert/strict";
import test from "node:test";
import type { ElasticDataClient, ElasticSearchResponse } from "../src/elasticsearch/data-index.js";
import type {
  AdPerformanceUpsert,
  DataImportRepository,
  ReviewUpsert,
} from "../src/import/importer.js";
import {
  importAdPerformanceAndIndex,
  importReviewsAndIndex,
} from "../src/pipeline/import-and-index.js";
import { IndexingAfterPersistenceError } from "../src/pipeline/errors.js";

class MemoryRepository implements DataImportRepository {
  reviews: ReviewUpsert[] = [];
  ads: AdPerformanceUpsert[] = [];

  async upsertReviews(records: ReviewUpsert[]): Promise<void> {
    this.reviews = records;
  }

  async upsertAdPerformance(records: AdPerformanceUpsert[]): Promise<void> {
    this.ads = records;
  }
}

function fakeElastic() {
  const batches: unknown[][] = [];
  const client: ElasticDataClient = {
    async bulk(request) {
      batches.push(request.operations);
      return { errors: false };
    },
    async search<T>(): Promise<ElasticSearchResponse<T>> {
      return { hits: { hits: [] } };
    },
  };
  return { client, batches };
}

test("review import persists before indexing merchant-scoped evidence", async () => {
  const repository = new MemoryRepository();
  const elastic = fakeElastic();
  const result = await importReviewsAndIndex({
    merchantId: "merchant-1",
    input: JSON.stringify([
      {
        sourceId: "review-1",
        productId: "product-1",
        rating: 5,
        text: "Dry all day",
        source: "test",
        reviewedAt: "2026-08-01T00:00:00.000Z",
      },
    ]),
    format: "json",
    attribution: "imported",
    repository,
    elastic: elastic.client,
  });

  assert.equal(result.imported.unique, 1);
  assert.equal(result.indexed, 1);
  assert.equal(repository.reviews[0]?.merchantId, "merchant-1");
  assert.equal(
    (elastic.batches[0]?.[0] as { index: { _id: string } }).index._id,
    "merchant-1:review:review-1",
  );
});

test("ad import persists and indexes normalized numeric evidence", async () => {
  const repository = new MemoryRepository();
  const elastic = fakeElastic();
  const result = await importAdPerformanceAndIndex({
    merchantId: "merchant-1",
    input: [
      "sourceId,productId,campaignId,messaging,channel,periodStart,periodEnd,impressions,clicks,purchases,spend,attributedRevenue,currency,source",
      "ad-1,product-1,campaign-1,Stay dry,meta,2026-08-01,2026-08-31,100,10,2,25,80,CAD,test",
    ].join("\n"),
    format: "csv",
    attribution: "imported",
    repository,
    elastic: elastic.client,
  });

  assert.equal(result.imported.records[0]?.impressions, 100);
  assert.equal(result.indexed, 1);
  assert.equal(repository.ads[0]?.merchantId, "merchant-1");
  assert.equal(
    (elastic.batches[0]?.[0] as { index: { _id: string } }).index._id,
    "merchant-1:ad:ad-1",
  );
});

test("an indexing failure explicitly reports already-persisted import records", async () => {
  const repository = new MemoryRepository();
  const elastic: ElasticDataClient = {
    async bulk() {
      return { errors: true, items: [{ index: { error: { reason: "mapping failure" } } }] };
    },
    async search<T>(): Promise<ElasticSearchResponse<T>> {
      return { hits: { hits: [] } };
    },
  };

  await assert.rejects(
    () => importReviewsAndIndex({
      merchantId: "merchant-1",
      input: JSON.stringify([
        {
          sourceId: "review-1",
          productId: "product-1",
          rating: 5,
          text: "Dry all day",
          source: "test",
          reviewedAt: "2026-08-01T00:00:00.000Z",
        },
      ]),
      format: "json",
      attribution: "imported",
      repository,
      elastic,
    }),
    (error) =>
      error instanceof IndexingAfterPersistenceError
      && error.recordType === "review"
      && error.persisted === 1
      && error.message.includes("run merchant reindex"),
  );
  assert.equal(repository.reviews.length, 1);
});
