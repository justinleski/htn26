import { indexEvidence, type ElasticDataClient } from "../elasticsearch/data-index.js";
import type { Product } from "../schemas.js";
import {
  syncShopifyProducts,
  type ProductRepository,
  type ProductUpsert,
  type ShopifyGraphqlExecutor,
} from "../shopify/products.js";
import { IndexingAfterPersistenceError } from "./errors.js";

function productEvidence(record: ProductUpsert): Product {
  return {
    id: record.shopifyId,
    merchantId: record.merchantId,
    shopifyId: record.shopifyId,
    title: record.title,
    description: record.description,
    price: record.price,
    currency: record.currency,
    attributes: record.attributes,
    createdAt: record.sourceUpdatedAt,
    updatedAt: record.sourceUpdatedAt,
  };
}

export async function syncShopifyProductsAndIndex(options: {
  merchantId: string;
  executeGraphql: ShopifyGraphqlExecutor;
  repository: ProductRepository;
  elastic: ElasticDataClient;
  pageSize?: number;
}): Promise<{ synced: number; indexed: number; pages: number }> {
  let indexed = 0;
  let persisted = 0;
  const result = await syncShopifyProducts({
    merchantId: options.merchantId,
    executeGraphql: options.executeGraphql,
    repository: options.repository,
    ...(options.pageSize ? { pageSize: options.pageSize } : {}),
    afterUpsert: async (products) => {
      persisted += products.length;
      try {
        const response = await indexEvidence(options.elastic, products.map(productEvidence));
        indexed += response.indexed;
      } catch (error) {
        throw new IndexingAfterPersistenceError("product", persisted, error);
      }
    },
  });
  return { ...result, indexed };
}
