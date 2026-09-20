import {
  AdPerformanceSchema,
  ProductSchema,
  ReviewSchema,
  type AdPerformance,
  type Product,
  type Review,
} from "../schemas.js";

const STAMP = "2026-08-31T00:00:00.000Z";

export const FIXTURE_MERCHANT_ID = "merchant-1";

export const FIXTURE_PRODUCTS: Product[] = [
  ProductSchema.parse({
    id: "rain-jacket",
    merchantId: FIXTURE_MERCHANT_ID,
    shopifyId: "gid://shopify/Product/1",
    title: "Rain Jacket",
    description: "A waterproof shell built for commutes, travel, and sudden rain.",
    price: "189.00",
    currency: "CAD",
    attributes: {
      handle: "rain-jacket",
      vendor: "North Trail",
      productType: "Outerwear",
      tags: ["waterproof", "commute", "travel"],
    },
    createdAt: STAMP,
    updatedAt: STAMP,
  }),
  ProductSchema.parse({
    id: "daypack",
    merchantId: FIXTURE_MERCHANT_ID,
    shopifyId: "gid://shopify/Product/2",
    title: "Daypack",
    description: "Weather-ready carry-all for everyday commuting and short trips.",
    price: "149.00",
    currency: "CAD",
    attributes: {
      handle: "daypack",
      vendor: "North Trail",
      productType: "Accessories",
      tags: ["commute", "city", "weather-ready"],
    },
    createdAt: STAMP,
    updatedAt: STAMP,
  }),
];

export const FIXTURE_REVIEWS: Review[] = [
  {
    sourceId: "demo-review-001",
    productId: "rain-jacket",
    rating: 5,
    text: "Stayed completely dry during a forty-minute walk in heavy rain.",
    source: "demo-review-import",
    reviewedAt: "2026-08-02T14:00:00.000Z",
  },
  {
    sourceId: "demo-review-002",
    productId: "rain-jacket",
    rating: 5,
    text: "The sealed pockets kept my phone dry on a wet commute.",
    source: "demo-review-import",
    reviewedAt: "2026-08-05T16:30:00.000Z",
  },
  {
    sourceId: "demo-review-003",
    productId: "rain-jacket",
    rating: 4,
    text: "Light enough to pack but handled a sudden downpour well.",
    source: "demo-review-import",
    reviewedAt: "2026-08-10T09:15:00.000Z",
  },
  {
    sourceId: "demo-review-004",
    productId: "rain-jacket",
    rating: 4,
    text: "The fit is comfortable and there is room for a sweater underneath.",
    source: "demo-review-import",
    reviewedAt: "2026-08-14T18:45:00.000Z",
  },
  {
    sourceId: "demo-review-005",
    productId: "rain-jacket",
    rating: 3,
    text: "Nice colour and clean design, although I bought it mainly for rain protection.",
    source: "demo-review-import",
    reviewedAt: "2026-08-20T12:20:00.000Z",
  },
  {
    sourceId: "demo-review-006",
    productId: "rain-jacket",
    rating: 5,
    text: "Water beaded off the shell and the hood stayed secure in strong wind.",
    source: "demo-review-import",
    reviewedAt: "2026-08-24T11:00:00.000Z",
  },
].map((row) =>
  ReviewSchema.parse({
    ...row,
    id: row.sourceId,
    merchantId: FIXTURE_MERCHANT_ID,
    attribution: "demo",
  }),
);

export const FIXTURE_ADS: AdPerformance[] = [
  {
    sourceId: "demo-ad-001",
    campaignId: "waterproof-proof-1",
    messaging: "Stay dry through the whole commute",
    channel: "meta",
    impressions: 10_000,
    clicks: 520,
    purchases: 62,
    spend: 600,
    attributedRevenue: 4960,
  },
  {
    sourceId: "demo-ad-002",
    campaignId: "waterproof-proof-2",
    messaging: "Sealed pockets for sudden downpours",
    channel: "instagram",
    impressions: 8_000,
    clicks: 384,
    purchases: 43,
    spend: 480,
    attributedRevenue: 3440,
  },
  {
    sourceId: "demo-ad-003",
    campaignId: "style-first-1",
    messaging: "A clean silhouette for every forecast",
    channel: "meta",
    impressions: 10_000,
    clicks: 210,
    purchases: 12,
    spend: 600,
    attributedRevenue: 960,
  },
  {
    sourceId: "demo-ad-004",
    campaignId: "style-first-2",
    messaging: "Your new favourite city layer",
    channel: "instagram",
    impressions: 8_000,
    clicks: 152,
    purchases: 8,
    spend: 480,
    attributedRevenue: 640,
  },
].map((row) =>
  AdPerformanceSchema.parse({
    ...row,
    id: row.sourceId,
    merchantId: FIXTURE_MERCHANT_ID,
    productId: "rain-jacket",
    periodStart: "2026-08-01T00:00:00.000Z",
    periodEnd: "2026-08-31T23:59:59.000Z",
    currency: "CAD",
    source: "demo-ad-import",
    attribution: "demo",
  }),
);
