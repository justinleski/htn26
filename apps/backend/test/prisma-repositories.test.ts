import assert from "node:assert/strict";
import test from "node:test";
import { createPrismaRepositories, type PrismaDataClient } from "../src/database/prisma-repositories.js";
import type { AdPerformanceUpsert, ReviewUpsert } from "../src/import/importer.js";
import type { ProductUpsert } from "../src/shopify/products.js";

type UpsertArgs = Parameters<PrismaDataClient["product"]["upsert"]>[0];

function fakeClient() {
  const products: UpsertArgs[] = [];
  const reviews: UpsertArgs[] = [];
  const ads: UpsertArgs[] = [];
  let transactions = 0;
  let findManyArgs: Parameters<PrismaDataClient["adPerformance"]["findMany"]>[0] | undefined;
  let findManyRecords: Array<Record<string, unknown>> = [];
  const delegate = (calls: UpsertArgs[]) => ({
    async upsert(args: UpsertArgs) {
      calls.push(args);
      return args;
    },
  });
  const client: PrismaDataClient = {
    product: delegate(products),
    review: delegate(reviews),
    adPerformance: {
      ...delegate(ads),
      async findMany(args) {
        findManyArgs = args;
        return findManyRecords;
      },
    },
    async $transaction(operations) {
      transactions += 1;
      return Promise.all(operations);
    },
  };
  return {
    client,
    products,
    reviews,
    ads,
    transactionCount: () => transactions,
    findManyArgs: () => findManyArgs,
    setFindManyRecords: (records: Array<Record<string, unknown>>) => {
      findManyRecords = records;
    },
  };
}

test("Prisma product upserts use the merchant and Shopify compound key", async () => {
  const fake = fakeClient();
  const repository = createPrismaRepositories(fake.client);
  const product: ProductUpsert = {
    merchantId: "merchant-1",
    shopifyId: "gid://shopify/Product/1",
    title: "Rain Jacket",
    description: "Waterproof shell",
    price: "129.00",
    currency: "CAD",
    attributes: { handle: "rain-jacket" },
    sourceUpdatedAt: "2026-09-19T12:00:00.000Z",
  };

  await repository.upsertProducts([product]);
  assert.deepEqual(fake.products[0]?.where, {
    merchantId_shopifyId: { merchantId: "merchant-1", shopifyId: "gid://shopify/Product/1" },
  });
  assert.ok(fake.products[0]?.create.sourceUpdatedAt instanceof Date);
  assert.equal(fake.transactionCount(), 1);
});

test("Prisma imports use merchant-scoped source IDs", async () => {
  const fake = fakeClient();
  const repository = createPrismaRepositories(fake.client);
  const review: ReviewUpsert = {
    merchantId: "merchant-1",
    sourceId: "review-1",
    productId: "product-1",
    rating: 5,
    text: "Dry all day",
    source: "test",
    reviewedAt: "2026-08-01T00:00:00.000Z",
    attribution: "imported",
  };
  const ad: AdPerformanceUpsert = {
    merchantId: "merchant-1",
    sourceId: "ad-1",
    productId: "product-1",
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

  await repository.upsertReviews([review]);
  await repository.upsertAdPerformance([ad]);
  assert.deepEqual(fake.reviews[0]?.where, {
    merchantId_sourceId: { merchantId: "merchant-1", sourceId: "review-1" },
  });
  assert.deepEqual(fake.ads[0]?.where, {
    merchantId_sourceId: { merchantId: "merchant-1", sourceId: "ad-1" },
  });
  assert.ok(fake.reviews[0]?.create.reviewedAt instanceof Date);
  assert.ok(fake.ads[0]?.create.periodStart instanceof Date);
  assert.equal(fake.transactionCount(), 2);
});

test("Prisma metric reads filter by merchant and normalize database values", async () => {
  const fake = fakeClient();
  fake.setFindManyRecords([
    {
      id: "ad-1",
      merchantId: "merchant-1",
      sourceId: "source-1",
      productId: "product-1",
      campaignId: "campaign-1",
      messaging: "Stay dry",
      channel: "meta",
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-08-31T23:59:59.000Z"),
      impressions: 100,
      clicks: 10,
      purchases: 2,
      spend: { toNumber: () => 25 },
      attributedRevenue: { toNumber: () => 80 },
      currency: "CAD",
      source: "test",
      attribution: "imported",
    },
  ]);
  const repository = createPrismaRepositories(fake.client);
  const records = await repository.listAdPerformance({ merchantId: "merchant-1", productId: "product-1" });

  assert.deepEqual(fake.findManyArgs()?.where, { merchantId: "merchant-1", productId: "product-1" });
  assert.equal(records[0]?.spend, 25);
  assert.equal(records[0]?.periodStart, "2026-08-01T00:00:00.000Z");
});
