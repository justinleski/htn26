import assert from "node:assert/strict";
import test from "node:test";
import { getDashboardMetrics, type AdPerformanceReader } from "../src/dashboard/metrics.js";
import type { AdPerformance } from "../src/schemas.js";

const ad: AdPerformance = {
  id: "ad-1",
  merchantId: "merchant-1",
  sourceId: "source-1",
  productId: "product-1",
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
  attribution: "imported",
};

test("dashboard metrics pass merchant and product isolation to the repository", async () => {
  let received: { merchantId: string; productId?: string } | undefined;
  const repository: AdPerformanceReader = {
    async listAdPerformance(options) {
      received = options;
      return [ad];
    },
  };

  const metrics = await getDashboardMetrics({
    merchantId: "merchant-1",
    productId: "product-1",
    repository,
  });
  assert.deepEqual(received, { merchantId: "merchant-1", productId: "product-1" });
  assert.equal(metrics.hasData, true);
  assert.equal(metrics.adCount, 1);
  assert.equal(metrics.groups[0]?.metrics.ctr.value, 0.1);
  assert.equal(metrics.groups[0]?.metrics.conversionRate.value, 0.2);
  assert.equal(metrics.groups[0]?.metrics.roas.value, 3.2);
});

test("dashboard metrics return an explicit empty state", async () => {
  const repository: AdPerformanceReader = {
    async listAdPerformance() {
      return [];
    },
  };
  assert.deepEqual(await getDashboardMetrics({ merchantId: "merchant-1", repository }), {
    hasData: false,
    adCount: 0,
    groups: [],
  });
});
