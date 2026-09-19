import assert from "node:assert/strict";
import test from "node:test";
import type { ElasticDataClient, ElasticSearchResponse } from "../src/elasticsearch/data-index.js";
import {
  reindexMerchantEvidence,
  type MerchantEvidenceReader,
} from "../src/pipeline/reindex.js";
import type { AdPerformance, Product, Review } from "../src/schemas.js";

const product: Product = {
  id: "product-db-1",
  merchantId: "merchant-1",
  shopifyId: "gid://shopify/Product/1",
  title: "Rain Jacket",
  description: "Waterproof shell",
  price: "129.00",
  currency: "CAD",
  attributes: { handle: "rain-jacket" },
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
};

const review: Review = {
  id: "review-db-1",
  merchantId: "merchant-1",
  sourceId: "review-1",
  productId: "product-db-1",
  rating: 5,
  text: "Dry all day",
  source: "test",
  reviewedAt: "2026-08-01T00:00:00.000Z",
  attribution: "imported",
};

const ad: AdPerformance = {
  id: "ad-db-1",
  merchantId: "merchant-1",
  sourceId: "ad-1",
  productId: "product-db-1",
  campaignId: "campaign-1",
  messaging: "Stay dry",
  channel: "meta",
  periodStart: "2026-08-01T00:00:00.000Z",
  periodEnd: "2026-08-31T23:59:59.000Z",
  impressions: 100,
  clicks: 10,
  purchases: 2,
  spend: 25,
  attributedRevenue: 80,
  currency: "CAD",
  source: "test",
  attribution: "imported",
};

test("merchant reindex rebuilds all evidence from Postgres in bounded batches", async () => {
  const reads: string[] = [];
  const repository: MerchantEvidenceReader = {
    async listProducts(options) {
      reads.push(`products:${options.merchantId}`);
      return [product];
    },
    async listReviews(options) {
      reads.push(`reviews:${options.merchantId}`);
      return [review];
    },
    async listAdPerformance(options) {
      reads.push(`ads:${options.merchantId}`);
      return [ad];
    },
  };
  const bulkSizes: number[] = [];
  const elastic: ElasticDataClient = {
    async bulk(request) {
      bulkSizes.push(request.operations.length / 2);
      return { errors: false };
    },
    async search<T>(): Promise<ElasticSearchResponse<T>> {
      return { hits: { hits: [] } };
    },
  };

  const result = await reindexMerchantEvidence({ merchantId: "merchant-1", repository, elastic, batchSize: 2 });

  assert.deepEqual(result, { indexed: 3, batches: 2 });
  assert.deepEqual(bulkSizes, [2, 1]);
  assert.deepEqual(reads.sort(), ["ads:merchant-1", "products:merchant-1", "reviews:merchant-1"]);
});

test("merchant reindex refuses cross-merchant repository records", async () => {
  const repository: MerchantEvidenceReader = {
    async listProducts() {
      return [{ ...product, merchantId: "merchant-2" }];
    },
    async listReviews() {
      return [];
    },
    async listAdPerformance() {
      return [];
    },
  };
  let bulkCalls = 0;
  const elastic: ElasticDataClient = {
    async bulk() {
      bulkCalls += 1;
      return { errors: false };
    },
    async search<T>(): Promise<ElasticSearchResponse<T>> {
      return { hits: { hits: [] } };
    },
  };

  await assert.rejects(
    () => reindexMerchantEvidence({ merchantId: "merchant-1", repository, elastic }),
    /unexpected merchant merchant-2/,
  );
  assert.equal(bulkCalls, 0);
});
