import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadDemoDataset } from "../src/demo/load.js";
import { calculateAdMetrics } from "../src/metrics/index.js";
import {
  DataImportError,
  importReviews,
  parseAdPerformanceRows,
  parseReviewRows,
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

test("malformed CSV is reported as an import validation error", () => {
  assert.throws(
    () => parseAdPerformanceRows('productId,campaignId,messaging\nrain-jacket,c1,"unterminated', "csv"),
    (error) => error instanceof DataImportError && error.errors[0]?.includes("Unterminated quoted field") === true,
  );
});

test("ad rows reject impossible funnel counts", () => {
  const base = {
    productId: "rain-jacket",
    campaignId: "campaign-1",
    messaging: "Stay dry",
    channel: "meta",
    periodStart: "2026-08-01T00:00:00.000Z",
    periodEnd: "2026-08-31T23:59:59.000Z",
    impressions: 100,
    clicks: 10,
    purchases: 2,
    spend: 25,
    attributedRevenue: 80,
    currency: "CAD",
    source: "test",
  };

  assert.throws(
    () => parseAdPerformanceRows(JSON.stringify([{ ...base, clicks: 101 }, { ...base, purchases: 11 }]), "json"),
    (error) =>
      error instanceof DataImportError
      && error.errors.some((message) => message.includes("clicks cannot exceed impressions"))
      && error.errors.some((message) => message.includes("purchases cannot exceed clicks")),
  );
});

test("imports enforce byte and row limits", () => {
  assert.throws(
    () => parseReviewRows("[]", "json", { maxBytes: 1, maxRows: 10 }),
    (error) => error instanceof DataImportError && error.errors[0]?.includes("maximum is 1 bytes") === true,
  );

  const reviews = [
    { productId: "p1", rating: 5, text: "Great", source: "test", reviewedAt: "2026-08-01" },
    { productId: "p1", rating: 4, text: "Good", source: "test", reviewedAt: "2026-08-02" },
  ];
  assert.throws(
    () => parseReviewRows(JSON.stringify(reviews), "json", { maxBytes: 10_000, maxRows: 1 }),
    (error) => error instanceof DataImportError && error.errors[0]?.includes("maximum is 1 rows") === true,
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

test("duplicate source IDs are deduplicated within one import", async () => {
  const repository = new MemoryImportRepository();
  const result = await importReviews({
    merchantId: "merchant-1",
    input: JSON.stringify([
      { sourceId: "review-1", productId: "p1", rating: 4, text: "First", source: "test", reviewedAt: "2026-08-01" },
      { sourceId: "review-1", productId: "p1", rating: 5, text: "Updated", source: "test", reviewedAt: "2026-08-02" },
    ]),
    format: "json",
    attribution: "imported",
    repository,
  });

  assert.deepEqual({ processed: result.processed, unique: result.unique, duplicateRows: result.duplicateRows }, {
    processed: 2,
    unique: 1,
    duplicateRows: 1,
  });
  assert.equal(repository.reviews.get("merchant-1:review-1")?.text, "Updated");
});

test("identical source IDs remain isolated between merchants", async () => {
  const repository = new MemoryImportRepository();
  const input = JSON.stringify([
    { sourceId: "shared-review", productId: "p1", rating: 5, text: "Great", source: "test", reviewedAt: "2026-08-01" },
  ]);

  await importReviews({ merchantId: "merchant-1", input, format: "json", attribution: "imported", repository });
  await importReviews({ merchantId: "merchant-2", input, format: "json", attribution: "imported", repository });
  assert.deepEqual([...repository.reviews.keys()].sort(), ["merchant-1:shared-review", "merchant-2:shared-review"]);
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
  const round = (value: number | null) => value === null ? null : Number(value.toFixed(6));
  const snapshot = {
    waterproof: {
      totals: totals("waterproof"),
      metrics: {
        ctr: round(waterproof.ctr.value),
        conversionRate: round(waterproof.conversionRate.value),
        roas: round(waterproof.roas.value),
      },
    },
    style: {
      totals: totals("style"),
      metrics: {
        ctr: round(style.ctr.value),
        conversionRate: round(style.conversionRate.value),
        roas: round(style.roas.value),
      },
    },
  };
  const expected = JSON.parse(await readFile(`${demoDirectory}expected-metrics.json`, "utf8"));
  assert.deepEqual(snapshot, expected);
});
