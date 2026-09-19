import assert from "node:assert/strict";
import test from "node:test";
import type { ElasticDataClient, ElasticSearchResponse } from "../src/elasticsearch/data-index.js";
import { IndexingAfterPersistenceError } from "../src/pipeline/errors.js";
import { syncShopifyProductsAndIndex } from "../src/pipeline/sync-and-index.js";
import type {
  ProductRepository,
  ProductUpsert,
  ShopifyGraphqlExecutor,
} from "../src/shopify/products.js";

test("Shopify sync persists each page before indexing it", async () => {
  const events: string[] = [];
  const repository: ProductRepository = {
    async upsertProducts(products: ProductUpsert[]) {
      events.push(`persist:${products[0]?.shopifyId}`);
    },
  };
  const elastic: ElasticDataClient = {
    async bulk(request) {
      const operation = request.operations[0] as { index: { _id: string } };
      events.push(`index:${operation.index._id}`);
      return { errors: false };
    },
    async search<T>(): Promise<ElasticSearchResponse<T>> {
      return { hits: { hits: [] } };
    },
  };
  let page = 0;
  const executeGraphql: ShopifyGraphqlExecutor = async <T>() => {
    page += 1;
    const shopifyId = `gid://shopify/Product/${page}`;
    return {
      products: {
        nodes: [
          {
            id: shopifyId,
            title: `Product ${page}`,
            description: "Weather ready",
            handle: `product-${page}`,
            vendor: "Demo",
            productType: "Outerwear",
            tags: ["rain"],
            updatedAt: "2026-09-19T12:00:00.000Z",
            priceRangeV2: { minVariantPrice: { amount: "129.00", currencyCode: "CAD" } },
          },
        ],
        pageInfo: { hasNextPage: page === 1, endCursor: page === 1 ? "next" : null },
      },
    } as T;
  };

  const result = await syncShopifyProductsAndIndex({
    merchantId: "merchant-1",
    executeGraphql,
    repository,
    elastic,
  });

  assert.deepEqual(result, { synced: 2, indexed: 2, pages: 2 });
  assert.deepEqual(events, [
    "persist:gid://shopify/Product/1",
    "index:merchant-1:product:gid://shopify/Product/1",
    "persist:gid://shopify/Product/2",
    "index:merchant-1:product:gid://shopify/Product/2",
  ]);
});

test("Shopify sync reports how many products persisted before indexing failed", async () => {
  const persisted: ProductUpsert[] = [];
  const repository: ProductRepository = {
    async upsertProducts(products) {
      persisted.push(...products);
    },
  };
  const elastic: ElasticDataClient = {
    async bulk() {
      return { errors: true, items: [{ index: { error: { reason: "cluster unavailable" } } }] };
    },
    async search<T>(): Promise<ElasticSearchResponse<T>> {
      return { hits: { hits: [] } };
    },
  };
  const executeGraphql: ShopifyGraphqlExecutor = async <T>() => ({
    products: {
      nodes: [
        {
          id: "gid://shopify/Product/1",
          title: "Rain Jacket",
          description: "Weather ready",
          handle: "rain-jacket",
          vendor: "Demo",
          productType: "Outerwear",
          tags: ["rain"],
          updatedAt: "2026-09-19T12:00:00.000Z",
          priceRangeV2: { minVariantPrice: { amount: "129.00", currencyCode: "CAD" } },
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  } as T);

  await assert.rejects(
    () => syncShopifyProductsAndIndex({ merchantId: "merchant-1", executeGraphql, repository, elastic }),
    (error) =>
      error instanceof IndexingAfterPersistenceError
      && error.recordType === "product"
      && error.persisted === 1,
  );
  assert.equal(persisted.length, 1);
});
