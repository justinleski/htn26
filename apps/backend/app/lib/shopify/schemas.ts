import { z } from "zod";

/** Loose Shopify Admin GraphQL product node (subset). */
export const ShopifyProductNodeSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    handle: z.string().optional(),
    status: z.string().optional(),
    descriptionHtml: z.string().optional(),
    description: z.string().optional(),
    vendor: z.string().optional(),
    productType: z.string().optional(),
    tags: z.array(z.string()).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    variants: z
      .object({
        edges: z
          .array(
            z
              .object({
                node: z
                  .object({
                    id: z.string().optional(),
                    title: z.string().optional(),
                    price: z.string().optional(),
                    sku: z.string().nullable().optional(),
                  })
                  .passthrough(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type ShopifyProductNode = z.infer<typeof ShopifyProductNodeSchema>;

export const ShopifyProductsConnectionSchema = z
  .object({
    products: z
      .object({
        edges: z.array(
          z
            .object({
              cursor: z.string().optional(),
              node: ShopifyProductNodeSchema,
            })
            .passthrough(),
        ),
        pageInfo: z
          .object({
            hasNextPage: z.boolean().optional(),
            endCursor: z.string().nullable().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();
