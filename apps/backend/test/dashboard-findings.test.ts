import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardFindings, classifyMessaging } from "../src/dashboard/findings.js";
import { loadDemoDataset } from "../src/demo/load.js";
import { pickRainJacketProduct } from "../src/demo/match.js";
import type { AdPerformanceUpsert, DataImportRepository, ReviewUpsert } from "../src/import/importer.js";
import type { Product } from "../src/schemas.js";

class MemoryImportRepository implements DataImportRepository {
  readonly reviews = new Map<string, ReviewUpsert>();
  readonly ads = new Map<string, AdPerformanceUpsert>();

  async upsertReviews(records: ReviewUpsert[]): Promise<void> {
    records.forEach((record) => this.reviews.set(`${record.merchantId}:${record.sourceId}`, record));
  }

  async upsertAdPerformance(records: AdPerformanceUpsert[]): Promise<void> {
    records.forEach((record) => this.ads.set(`${record.merchantId}:${record.sourceId}`, record));
  }
}

test("classifyMessaging distinguishes waterproof and style copy", () => {
  assert.equal(classifyMessaging("Stay dry through the whole commute"), "waterproof");
  assert.equal(classifyMessaging("A clean silhouette for every forecast"), "style");
  assert.equal(classifyMessaging("Room for a sweater underneath"), "other");
});

test("demo findings flag waterproof ads as stronger without claiming causation", async () => {
  const repository = new MemoryImportRepository();
  await loadDemoDataset({ merchantId: "merchant-1", repository });
  const ads = [...repository.ads.values()].map((ad) => ({ id: ad.sourceId, ...ad }));
  const reviews = [...repository.reviews.values()].map((review) => ({ id: review.sourceId, ...review }));
  const { findings, themes } = buildDashboardFindings({ ads, reviews });

  const waterproof = themes.find((theme) => theme.theme === "waterproof");
  const style = themes.find((theme) => theme.theme === "style");
  assert.equal(waterproof?.adCount, 2);
  assert.equal(style?.adCount, 2);
  assert.ok(Math.abs((waterproof?.metrics.ctr.value ?? 0) - 904 / 18000) < 1e-6);
  assert.ok(Math.abs((style?.metrics.ctr.value ?? 0) - 362 / 18000) < 1e-6);
  assert.ok(Math.abs((waterproof?.metrics.conversionRate.value ?? 0) - 105 / 904) < 1e-6);
  assert.ok(Math.abs((waterproof?.metrics.roas.value ?? 0) - 8400 / 1080) < 1e-6);

  const working = findings.find((finding) => finding.kind === "working");
  const weaker = findings.find((finding) => finding.kind === "weaker");
  assert.ok(working?.title.includes("Waterproof"));
  assert.ok(working?.observation.includes("purchases/clicks"));
  assert.ok(working?.limitations.some((limitation) => limitation.includes("not proof")));
  assert.ok(weaker?.title.includes("Style-first"));
});

test("findings stay insufficient until both messaging themes have ads", () => {
  const { findings } = buildDashboardFindings({ ads: [], reviews: [] });
  assert.equal(findings[0]?.kind, "insufficient");
});

test("pickRainJacketProduct prefers handle and title matches", () => {
  const products: Product[] = [
    {
      id: "p-umbrella",
      merchantId: "m1",
      shopifyId: "gid://shopify/Product/1",
      title: "Umbrella",
      description: "",
      price: "20",
      currency: "CAD",
      attributes: { handle: "umbrella" },
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
    {
      id: "p-jacket",
      merchantId: "m1",
      shopifyId: "gid://shopify/Product/2",
      title: "Packable Rain Jacket",
      description: "",
      price: "129",
      currency: "CAD",
      attributes: { handle: "rain-jacket" },
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
  ];
  assert.equal(pickRainJacketProduct(products)?.id, "p-jacket");
});

test("demo import remaps productId onto a Shopify product id", async () => {
  const repository = new MemoryImportRepository();
  await loadDemoDataset({
    merchantId: "merchant-1",
    repository,
    productIdMap: { "rain-jacket": "prod_real" },
  });
  assert.equal([...repository.reviews.values()][0]?.productId, "prod_real");
  assert.equal([...repository.ads.values()][0]?.productId, "prod_real");
});
