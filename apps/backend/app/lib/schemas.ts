/**
 * Loose shared Zod schemas for Marketing Copilot domain entities.
 * UI/routes can keep these flexible; the data pipeline in `src/schemas.ts` is strict.
 * Always import types from here for the Shopify app; do not duplicate entities in routes.
 */
import { z } from "zod";

/** Extra / future fields pass through without failing parse. */
const looseObject = z.object({}).passthrough();

export const AdPerformanceSourceSchema = z.enum([
  "demo",
  "csv",
  "google_analytics",
  "shopify",
]);
export type AdPerformanceSource = z.infer<typeof AdPerformanceSourceSchema>;

export const IntegrationProviderSchema = z.enum([
  "google_analytics",
  "shopify",
]);
export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>;

export const IntegrationStatusSchema = z.enum([
  "disconnected",
  "pending",
  "connected",
  "error",
]);
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;

export const GenerationRunStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
]);
export type GenerationRunStatus = z.infer<typeof GenerationRunStatusSchema>;

export const MerchantSchema = z
  .object({
    id: z.string().optional(),
    merchantId: z.string().optional(),
    shop: z.string().optional(),
    name: z.string().optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type Merchant = z.infer<typeof MerchantSchema>;

export const ProductSchema = z
  .object({
    id: z.string().optional(),
    merchantId: z.string().optional(),
    shopifyId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().nullable().optional(),
    handle: z.string().optional(),
    status: z.string().optional(),
    price: z.union([z.string(), z.number()]).optional(),
    currency: z.string().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type Product = z.infer<typeof ProductSchema>;

export const ReviewSchema = z
  .object({
    id: z.string().optional(),
    merchantId: z.string().optional(),
    productId: z.string().optional(),
    rating: z.number().min(0).max(5).optional(),
    text: z.string().optional(),
    source: z.string().optional(),
    date: z.union([z.string(), z.date()]).optional(),
  })
  .passthrough();
export type Review = z.infer<typeof ReviewSchema>;

export const AdPerformanceSchema = z
  .object({
    id: z.string().optional(),
    merchantId: z.string().optional(),
    productId: z.string().optional(),
    campaignId: z.string().optional(),
    campaignName: z.string().optional(),
    messaging: z.string().optional(),
    channel: z.string().optional(),
    source: AdPerformanceSourceSchema.optional(),
    dateStart: z.union([z.string(), z.date()]).optional(),
    dateEnd: z.union([z.string(), z.date()]).optional(),
    impressions: z.number().optional(),
    clicks: z.number().optional(),
    purchases: z.number().optional(),
    spend: z.number().optional(),
    attributedRevenue: z.number().optional(),
    currency: z.string().optional(),
    /** GA4-ish loose metrics bag */
    metrics: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type AdPerformance = z.infer<typeof AdPerformanceSchema>;

export const InsightSchema = z
  .object({
    id: z.string().optional(),
    merchantId: z.string().optional(),
    finding: z.string().optional(),
    supportingSourceIds: z.array(z.string()).optional(),
    observedMetrics: z.record(z.string(), z.unknown()).optional(),
    limitations: z.array(z.string()).optional(),
  })
  .passthrough();
export type Insight = z.infer<typeof InsightSchema>;

export const CampaignVariantSchema = z
  .object({
    label: z.string().optional(),
    change: z.string().optional(),
    hypothesis: z.string().optional(),
    content: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const CampaignSchema = z
  .object({
    id: z.string().optional(),
    merchantId: z.string().optional(),
    productId: z.string().optional(),
    objective: z.string().optional(),
    audience: z.string().optional(),
    strategy: z.string().optional(),
    hooks: z.array(z.string()).optional(),
    captions: z.array(z.string()).optional(),
    abVariants: z.array(CampaignVariantSchema).optional(),
    supportingEvidence: z.array(z.string()).optional(),
    validationResults: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type Campaign = z.infer<typeof CampaignSchema>;

export const GenerationRunSchema = z
  .object({
    id: z.string().optional(),
    merchantId: z.string().optional(),
    status: GenerationRunStatusSchema.optional(),
    startedAt: z.union([z.string(), z.date()]).optional(),
    finishedAt: z.union([z.string(), z.date()]).optional(),
    error: z.string().nullable().optional(),
    campaignId: z.string().nullable().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type GenerationRun = z.infer<typeof GenerationRunSchema>;

export const MerchantIntegrationSchema = z
  .object({
    id: z.string().optional(),
    merchantId: z.string(),
    shop: z.string().optional(),
    provider: IntegrationProviderSchema.or(z.string()),
    status: IntegrationStatusSchema.or(z.string()).optional(),
    /** Property ID, account email, scopes — never put secrets here in client responses */
    metadata: z.record(z.string(), z.unknown()).optional(),
    connectedAt: z.union([z.string(), z.date()]).nullable().optional(),
  })
  .passthrough();
export type MerchantIntegration = z.infer<typeof MerchantIntegrationSchema>;

/** Re-export a bag of all domain schemas for Dev 2 / Dev 3 discovery. */
export const DomainSchemas = {
  Merchant: MerchantSchema,
  Product: ProductSchema,
  Review: ReviewSchema,
  AdPerformance: AdPerformanceSchema,
  Insight: InsightSchema,
  Campaign: CampaignSchema,
  GenerationRun: GenerationRunSchema,
  MerchantIntegration: MerchantIntegrationSchema,
  AdPerformanceSource: AdPerformanceSourceSchema,
} as const;

/** @deprecated Prefer named exports; kept for TEAM_PLAN path `app/lib/schemas.ts`. */
export { looseObject };
