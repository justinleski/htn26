import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import { ProductSchema, type Product } from "../schemas";
import {
  ShopifyProductNodeSchema,
  ShopifyProductsConnectionSchema,
  type ShopifyProductNode,
} from "./schemas";

/** Authenticated Admin API context from `authenticate.admin(request)`. */
export type ShopifyAdminClient = AdminApiContext;

const PRODUCTS_QUERY = `#graphql
  query MarketingCopilotProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          title
          handle
          status
          descriptionHtml
          vendor
          productType
          tags
          createdAt
          updatedAt
          variants(first: 5) {
            edges {
              node {
                id
                title
                price
                sku
              }
            }
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

const PRODUCT_QUERY = `#graphql
  query MarketingCopilotProduct($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      status
      descriptionHtml
      vendor
      productType
      tags
      createdAt
      updatedAt
      variants(first: 10) {
        edges {
          node {
            id
            title
            price
            sku
          }
        }
      }
    }
  }
`;

export function mapShopifyProductToLoose(
  node: ShopifyProductNode,
  merchantId?: string,
): Product {
  const firstPrice = node.variants?.edges?.[0]?.node?.price;
  return ProductSchema.parse({
    merchantId,
    shopifyId: node.id,
    title: node.title,
    description: node.descriptionHtml ?? node.description ?? null,
    handle: node.handle,
    status: node.status,
    price: firstPrice,
    attributes: {
      vendor: node.vendor,
      productType: node.productType,
      tags: node.tags,
    },
    raw: node,
  });
}

/**
 * List products via Admin GraphQL. Requires an authenticated admin client
 * from `authenticate.admin(request)`.
 */
export async function listProducts(
  admin: ShopifyAdminClient,
  options: { first?: number; after?: string; merchantId?: string } = {},
): Promise<{ products: Product[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }> {
  const first = options.first ?? 25;
  const response = await admin.graphql(PRODUCTS_QUERY, {
    variables: { first, after: options.after ?? null },
  });
  const json = await response.json();
  const parsed = ShopifyProductsConnectionSchema.safeParse(json.data);
  if (!parsed.success) {
    throw new Error(`Unexpected products payload: ${parsed.error.message}`);
  }

  const edges = parsed.data.products.edges ?? [];
  const products = edges.map((edge) =>
    mapShopifyProductToLoose(edge.node, options.merchantId),
  );
  const pageInfo = parsed.data.products.pageInfo ?? {
    hasNextPage: false,
    endCursor: null,
  };

  return {
    products,
    pageInfo: {
      hasNextPage: Boolean(pageInfo.hasNextPage),
      endCursor: pageInfo.endCursor ?? null,
    },
  };
}

/**
 * Fetch a single product by Shopify GID.
 */
export async function fetchProduct(
  admin: ShopifyAdminClient,
  productGid: string,
  merchantId?: string,
): Promise<Product | null> {
  const response = await admin.graphql(PRODUCT_QUERY, {
    variables: { id: productGid },
  });
  const json = await response.json();
  const node = json.data?.product;
  if (!node) return null;
  const parsed = ShopifyProductNodeSchema.safeParse(node);
  if (!parsed.success) {
    throw new Error(`Unexpected product payload: ${parsed.error.message}`);
  }
  return mapShopifyProductToLoose(parsed.data, merchantId);
}
