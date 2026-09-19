import assert from "node:assert/strict";
import test from "node:test";
import {
  syncShopifyProducts,
  type ProductRepository,
  type ProductUpsert,
  type ShopifyGraphqlExecutor,
} from "../src/shopify/products.js";

class MemoryProductRepository implements ProductRepository {
  readonly products = new Map<string, ProductUpsert>();

  async upsertProducts(products: ProductUpsert[]): Promise<void> {
    products.forEach((product) => this.products.set(`${product.merchantId}:${product.shopifyId}`, product));
  }
}

test("product sync paginates and upserts by merchant and Shopify ID", async () => {
  const repository = new MemoryProductRepository();
  const cursors: unknown[] = [];
  const executeGraphql: ShopifyGraphqlExecutor = async <T>(_query: string, variables: Record<string, unknown>) => {
    cursors.push(variables.after);
    const secondPage = variables.after === "next";
    return {
      products: {
        nodes: [
          {
            id: secondPage ? "gid://shopify/Product/2" : "gid://shopify/Product/1",
            title: secondPage ? "Umbrella" : "Rain Jacket",
            description: "Weather ready",
            handle: secondPage ? "umbrella" : "rain-jacket",
            vendor: "Demo",
            productType: "Outerwear",
            tags: ["rain"],
            updatedAt: "2026-09-19T12:00:00.000Z",
            priceRangeV2: { minVariantPrice: { amount: "129.00", currencyCode: "cad" } },
          },
        ],
        pageInfo: { hasNextPage: !secondPage, endCursor: secondPage ? null : "next" },
      },
    } as T;
  };

  const result = await syncShopifyProducts({ merchantId: "merchant-1", executeGraphql, repository });
  assert.deepEqual(result, { synced: 2, pages: 2 });
  assert.deepEqual(cursors, [null, "next"]);
  assert.equal(repository.products.size, 2);

  await syncShopifyProducts({ merchantId: "merchant-1", executeGraphql, repository });
  assert.equal(repository.products.size, 2);
});
