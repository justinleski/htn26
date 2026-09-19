import assert from "node:assert/strict";
import test from "node:test";
import { calculateAdMetrics, groupAdMetrics, ratio } from "../src/metrics/index.js";
import type { AdPerformance } from "../src/schemas.js";

test("ratio reports zero denominators instead of returning Infinity", () => {
  assert.deepEqual(ratio(4, 0), { value: null, reason: "zero-denominator" });
  assert.deepEqual(ratio(undefined, 10), { value: null, reason: "missing-value" });
});

test("ad metrics use clicks/impressions, purchases/clicks, and revenue/spend", () => {
  assert.deepEqual(
    calculateAdMetrics({ impressions: 1_000, clicks: 50, purchases: 5, spend: 100, attributedRevenue: 400 }),
    { ctr: { value: 0.05 }, conversionRate: { value: 0.1 }, roas: { value: 4 } },
  );
});

test("aggregation keeps currencies and reporting periods separate", () => {
  const base: AdPerformance = {
    id: "ad-1",
    merchantId: "merchant-1",
    sourceId: "source-1",
    productId: "product-1",
    campaignId: "campaign-1",
    messaging: "Waterproof",
    channel: "meta",
    periodStart: "2026-08-01T00:00:00.000Z",
    periodEnd: "2026-08-31T23:59:59.000Z",
    impressions: 100,
    clicks: 10,
    purchases: 1,
    spend: 10,
    attributedRevenue: 40,
    currency: "CAD",
    source: "test",
    attribution: "imported",
  };

  const groups = groupAdMetrics([
    base,
    { ...base, id: "ad-2", sourceId: "source-2", currency: "USD" },
    { ...base, id: "ad-3", sourceId: "source-3", periodStart: "2026-09-01T00:00:00.000Z" },
  ]);
  assert.equal(groups.length, 3);
});
