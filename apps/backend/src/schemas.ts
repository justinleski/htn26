import { z } from "zod";

const id = z.string().trim().min(1);
const isoDateTime = z.string().datetime({ offset: true });
const currency = z.string().trim().length(3).transform((value) => value.toUpperCase());
const decimal = z.string().regex(/^\d+(?:\.\d+)?$/, "Expected a non-negative decimal string");

export const AttributionSchema = z.enum(["imported", "demo"]);

export const MerchantSchema = z.object({
  id,
  shopDomain: z.string().trim().min(1),
  settings: z.record(z.string(), z.unknown()).default({}),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const ProductSchema = z.object({
  id,
  merchantId: id,
  shopifyId: id,
  title: z.string().trim().min(1),
  description: z.string().default(""),
  price: decimal,
  currency,
  attributes: z.record(z.string(), z.unknown()).default({}),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const ReviewSchema = z.object({
  id,
  merchantId: id,
  sourceId: id,
  productId: id,
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(1),
  source: z.string().trim().min(1),
  reviewedAt: isoDateTime,
  attribution: AttributionSchema,
});

export const AdPerformanceSchema = z.object({
  id,
  merchantId: id,
  sourceId: id,
  productId: id,
  campaignId: id,
  messaging: z.string().trim().min(1),
  channel: z.string().trim().min(1),
  periodStart: isoDateTime,
  periodEnd: isoDateTime,
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  purchases: z.number().int().nonnegative(),
  spend: z.number().nonnegative(),
  attributedRevenue: z.number().nonnegative(),
  currency,
  source: z.string().trim().min(1),
  attribution: AttributionSchema,
});

export const MetricValueSchema = z.object({
  value: z.number().nullable(),
  reason: z.string().optional(),
});

export const InsightSchema = z.object({
  id,
  merchantId: id,
  productId: id,
  finding: z.string().trim().min(1),
  supportingSourceIds: z.array(id),
  observedMetrics: z.record(z.string(), MetricValueSchema),
  limitations: z.array(z.string()),
  createdAt: isoDateTime,
});

export const ABVariantSchema = z.object({
  name: z.string().trim().min(1),
  content: z.string().trim().min(1),
  changedElement: z.string().trim().min(1),
  hypothesis: z.string().trim().min(1),
});

export const CampaignSchema = z.object({
  id,
  merchantId: id,
  productId: id,
  objective: z.string().trim().min(1),
  audience: z.string().trim().min(1),
  strategy: z.string().trim().min(1),
  hooks: z.array(z.string().trim().min(1)).length(3),
  captions: z.array(z.string().trim().min(1)).length(3),
  variants: z.array(ABVariantSchema).length(2),
  supportingSourceIds: z.array(id),
  validationResults: z.array(z.string()),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const GenerationRunSchema = z.object({
  id,
  merchantId: id,
  status: z.enum(["pending", "succeeded", "failed"]),
  startedAt: isoDateTime,
  completedAt: isoDateTime.nullable(),
  errorDetails: z.string().nullable(),
  campaignId: id.nullable(),
});

export type Attribution = z.infer<typeof AttributionSchema>;
export type Merchant = z.infer<typeof MerchantSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type AdPerformance = z.infer<typeof AdPerformanceSchema>;
export type Insight = z.infer<typeof InsightSchema>;
export type Campaign = z.infer<typeof CampaignSchema>;
export type GenerationRun = z.infer<typeof GenerationRunSchema>;
