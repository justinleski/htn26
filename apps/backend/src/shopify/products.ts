export interface ShopifyProductNode {
  id: string;
  title: string;
  description: string;
  handle: string;
  vendor: string;
  productType: string;
  tags: string[];
  updatedAt: string;
  priceRangeV2: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
}

interface ShopifyProductsPage {
  products: {
    nodes: ShopifyProductNode[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

export interface ProductUpsert {
  merchantId: string;
  shopifyId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  attributes: Record<string, unknown>;
  sourceUpdatedAt: string;
}

export interface ProductRepository {
  upsertProducts(products: ProductUpsert[]): Promise<void>;
}

export type ShopifyGraphqlExecutor = <T>(
  query: string,
  variables: Record<string, unknown>,
) => Promise<T>;

export const PRODUCTS_QUERY = `#graphql
  query ProductsForMarketingCopilot($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        id
        title
        description
        handle
        vendor
        productType
        tags
        updatedAt
        priceRangeV2 {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function syncShopifyProducts(options: {
  merchantId: string;
  executeGraphql: ShopifyGraphqlExecutor;
  repository: ProductRepository;
  pageSize?: number;
}): Promise<{ synced: number; pages: number }> {
  if (!options.merchantId.trim()) throw new Error("merchantId is required");
  const pageSize = options.pageSize ?? 100;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 250) {
    throw new Error("pageSize must be an integer between 1 and 250");
  }

  let cursor: string | null = null;
  let synced = 0;
  let pages = 0;

  do {
    const result: ShopifyProductsPage = await options.executeGraphql<ShopifyProductsPage>(PRODUCTS_QUERY, {
      first: pageSize,
      after: cursor,
    });
    const page = result.products;
    const products = page.nodes.map((product) => ({
      merchantId: options.merchantId,
      shopifyId: product.id,
      title: product.title,
      description: product.description ?? "",
      price: product.priceRangeV2.minVariantPrice.amount,
      currency: product.priceRangeV2.minVariantPrice.currencyCode.toUpperCase(),
      attributes: {
        handle: product.handle,
        vendor: product.vendor,
        productType: product.productType,
        tags: product.tags,
      },
      sourceUpdatedAt: product.updatedAt,
    }));

    if (products.length > 0) await options.repository.upsertProducts(products);
    synced += products.length;
    pages += 1;
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;

    if (page.pageInfo.hasNextPage && !cursor) {
      throw new Error("Shopify returned hasNextPage without an endCursor");
    }
  } while (cursor);

  return { synced, pages };
}
