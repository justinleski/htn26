import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadDemoDataset } from "../src/demo/load.js";
import { calculateAdMetrics } from "../src/metrics/index.js";
import {
  DataImportError,
  importReviews,
  parseAdPerformanceRows,
  type AdPerformanceUpsert,
  type DataImportRepository,
  type ReviewUpsert,
} from "../src/import/importer.js";

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

test("CSV parsing supports quoted messaging and coerces numeric fields", () => {
  const csv = [
    "productId,campaignId,messaging,channel,periodStart,periodEnd,impressions,clicks,purchases,spend,attributedRevenue,currency,source",
    'rain-jacket,c1,"Dry, even downtown",meta,2026-08-01,2026-08-31,100,10,2,25,80,cad,test',
  ].join("\n");
  const [row] = parseAdPerformanceRows(csv, "csv");
  assert.equal(row?.messaging, "Dry, even downtown");
  assert.equal(row?.impressions, 100);
  assert.equal(row?.currency, "CAD");
});

test("invalid rows return clear row and field errors", () => {
  assert.throws(
    () =>
      parseAdPerformanceRows(
        JSON.stringify([{ productId: "rain-jacket", campaignId: "campaign", impressions: -1 }]),
        "json",
      ),
    (error) => error instanceof DataImportError && error.errors.some((message) => message.includes("row 1.impressions")),
  );
});

test("generated source IDs make repeated review imports idempotent", async () => {
  const repository = new MemoryImportRepository();
  const input = JSON.stringify([
    {
      productId: "rain-jacket",
      rating: 5,
      text: "Dry all day",
      source: "test",
      reviewedAt: "2026-08-01T00:00:00.000Z",
    },
  ]);

  await importReviews({ merchantId: "merchant-1", input, format: "json", attribution: "imported", repository });
  await importReviews({ merchantId: "merchant-1", input, format: "json", attribution: "imported", repository });
  assert.equal(repository.reviews.size, 1);
});

test("demo dataset can be loaded twice without creating duplicates", async () => {
  const repository = new MemoryImportRepository();
  const demoDirectory = fileURLToPath(new URL("../../../data/demo/", import.meta.url));
  await loadDemoDataset({ merchantId: "merchant-1", repository, demoDirectory });
  await loadDemoDataset({ merchantId: "merchant-1", repository, demoDirectory });

  assert.equal(repository.reviews.size, 6);
  assert.equal(repository.ads.size, 4);
  assert.ok([...repository.reviews.values()].every((review) => review.attribution === "demo"));
  assert.ok([...repository.ads.values()].every((ad) => ad.attribution === "demo"));

  const totals = (prefix: string) =>
    [...repository.ads.values()]
      .filter((ad) => ad.campaignId.startsWith(prefix))
      .reduce(
        (sum, ad) => ({
          impressions: sum.impressions + ad.impressions,
          clicks: sum.clicks + ad.clicks,
          purchases: sum.purchases + ad.purchases,
          spend: sum.spend + ad.spend,
          attributedRevenue: sum.attributedRevenue + ad.attributedRevenue,
        }),
        { impressions: 0, clicks: 0, purchases: 0, spend: 0, attributedRevenue: 0 },
      );
  const waterproof = calculateAdMetrics(totals("waterproof"));
  const style = calculateAdMetrics(totals("style"));
  assert.ok(waterproof.ctr.value! > style.ctr.value!);
  assert.ok(waterproof.roas.value! > style.roas.value!);
});
