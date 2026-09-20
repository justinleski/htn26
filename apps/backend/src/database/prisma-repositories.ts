import type { DataImportRepository, AdPerformanceUpsert, ReviewUpsert } from "../import/importer.js";
import type { AdPerformanceReader } from "../dashboard/metrics.js";
import type { MerchantEvidenceReader } from "../pipeline/reindex.js";
import {
  AdPerformanceSchema,
  ProductSchema,
  ReviewSchema,
  type AdPerformance,
  type Product,
  type Review,
} from "../schemas.js";
import type { ProductRepository, ProductUpsert } from "../shopify/products.js";

type PrismaOperation = Promise<unknown>;

interface UpsertDelegate {
  upsert(args: {
    where: Record<string, unknown>;
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }): PrismaOperation;
}

interface FindManyDelegate {
  findMany(args: {
    where: Record<string, unknown>;
    orderBy?: Array<Record<string, "asc" | "desc">>;
  }): Promise<Array<Record<string, unknown>>>;
}

export interface PrismaDataClient {
  product: UpsertDelegate & FindManyDelegate;
  review: UpsertDelegate & FindManyDelegate;
  adPerformance: UpsertDelegate & FindManyDelegate;
  $transaction(operations: PrismaOperation[]): Promise<unknown>;
}

export type PrismaRepositories =
  & DataImportRepository
  & ProductRepository
  & AdPerformanceReader
  & MerchantEvidenceReader;

function numericValue(value: unknown, field: string): number {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const toNumber = (value as { toNumber?: unknown }).toNumber;
    if (typeof toNumber === "function") return toNumber.call(value) as number;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid numeric database value for ${field}`);
  return parsed;
}

function dateValue(value: unknown, field: string): string {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date database value for ${field}`);
  return date.toISOString();
}

function decimalString(value: unknown, field: string): string {
  const stringValue = typeof value === "string" ? value : String(value);
  if (!/^\d+(?:\.\d+)?$/.test(stringValue)) throw new Error(`Invalid decimal database value for ${field}`);
  return stringValue;
}

function normalizeProduct(record: Record<string, unknown>): Product {
  return ProductSchema.parse({
    ...record,
    price: decimalString(record.price, "price"),
    createdAt: dateValue(record.createdAt, "createdAt"),
    updatedAt: dateValue(record.updatedAt, "updatedAt"),
  });
}

function normalizeReview(record: Record<string, unknown>): Review {
  return ReviewSchema.parse({
    ...record,
    reviewedAt: dateValue(record.reviewedAt, "reviewedAt"),
  });
}

function normalizeAdPerformance(record: Record<string, unknown>): AdPerformance {
  return AdPerformanceSchema.parse({
    ...record,
    periodStart: dateValue(record.periodStart, "periodStart"),
    periodEnd: dateValue(record.periodEnd, "periodEnd"),
    impressions: numericValue(record.impressions, "impressions"),
    clicks: numericValue(record.clicks, "clicks"),
    purchases: numericValue(record.purchases, "purchases"),
    spend: numericValue(record.spend, "spend"),
    attributedRevenue: numericValue(record.attributedRevenue, "attributedRevenue"),
  });
}

function reviewData(record: ReviewUpsert): Record<string, unknown> {
  return {
    merchantId: record.merchantId,
    sourceId: record.sourceId,
    productId: record.productId,
    rating: record.rating,
    text: record.text,
    source: record.source,
    reviewedAt: new Date(record.reviewedAt),
    attribution: record.attribution,
  };
}

function adData(record: AdPerformanceUpsert): Record<string, unknown> {
  return {
    merchantId: record.merchantId,
    sourceId: record.sourceId,
    productId: record.productId,
    campaignId: record.campaignId,
    messaging: record.messaging,
    channel: record.channel,
    periodStart: new Date(record.periodStart),
    periodEnd: new Date(record.periodEnd),
    impressions: record.impressions,
    clicks: record.clicks,
    purchases: record.purchases,
    spend: record.spend,
    attributedRevenue: record.attributedRevenue,
    currency: record.currency,
    source: record.source,
    attribution: record.attribution,
  };
}

function productData(record: ProductUpsert): Record<string, unknown> {
  return {
    merchantId: record.merchantId,
    shopifyId: record.shopifyId,
    title: record.title,
    description: record.description,
    price: record.price,
    currency: record.currency,
    attributes: record.attributes,
    sourceUpdatedAt: new Date(record.sourceUpdatedAt),
  };
}

export function createPrismaRepositories(client: PrismaDataClient): PrismaRepositories {
  return {
    async upsertProducts(records) {
      await client.$transaction(
        records.map((record) => {
          const data = productData(record);
          return client.product.upsert({
            where: {
              merchantId_shopifyId: {
                merchantId: record.merchantId,
                shopifyId: record.shopifyId,
              },
            },
            create: {
              ...(record.id ? { id: record.id } : {}),
              ...data,
            },
            update: data,
          });
        }),
      );
    },

    async upsertReviews(records) {
      await client.$transaction(
        records.map((record) => {
          const data = reviewData(record);
          return client.review.upsert({
            where: {
              merchantId_sourceId: {
                merchantId: record.merchantId,
                sourceId: record.sourceId,
              },
            },
            create: data,
            update: data,
          });
        }),
      );
    },

    async upsertAdPerformance(records) {
      await client.$transaction(
        records.map((record) => {
          const data = adData(record);
          return client.adPerformance.upsert({
            where: {
              merchantId_sourceId: {
                merchantId: record.merchantId,
                sourceId: record.sourceId,
              },
            },
            create: data,
            update: data,
          });
        }),
      );
    },

    async listAdPerformance(options) {
      const records = await client.adPerformance.findMany({
        where: {
          merchantId: options.merchantId,
          ...(options.productId ? { productId: options.productId } : {}),
        },
        orderBy: [{ periodStart: "asc" }, { sourceId: "asc" }],
      });
      return records.map(normalizeAdPerformance);
    },

    async listProducts(options) {
      const records = await client.product.findMany({
        where: { merchantId: options.merchantId },
        orderBy: [{ shopifyId: "asc" }],
      });
      return records.map(normalizeProduct);
    },

    async listReviews(options) {
      const records = await client.review.findMany({
        where: { merchantId: options.merchantId },
        orderBy: [{ sourceId: "asc" }],
      });
      return records.map(normalizeReview);
    },
  };
}
