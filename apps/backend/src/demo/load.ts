import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  importAdPerformance,
  importReviews,
  type AdPerformanceUpsert,
  type DataImportRepository,
  type ImportResult,
  type ReviewUpsert,
} from "../import/importer.js";

function defaultDemoDirectory(): string {
  const fromModule = fileURLToPath(new URL("../../../../data/demo/", import.meta.url));
  const candidates = [
    fromModule,
    resolve(process.cwd(), "data/demo"),
    resolve(process.cwd(), "../../data/demo"),
  ];
  return candidates.find((directory) => existsSync(resolve(directory, "reviews.json"))) ?? fromModule;
}

export function applyProductIdMap(input: string, productIdMap?: Record<string, string>): string {
  if (!productIdMap) return input;
  let next = input;
  for (const [from, to] of Object.entries(productIdMap)) {
    if (!from || from === to) continue;
    next = next.replaceAll(`"productId": "${from}"`, `"productId": ${JSON.stringify(to)}`);
    next = next.replaceAll(`,${from},`, `,${to},`);
  }
  return next;
}

export async function loadDemoDataset(options: {
  merchantId: string;
  repository: DataImportRepository;
  demoDirectory?: string;
  productIdMap?: Record<string, string>;
}): Promise<{
  reviews: ImportResult<ReviewUpsert>;
  ads: ImportResult<AdPerformanceUpsert>;
}> {
  const directory = options.demoDirectory ?? defaultDemoDirectory();
  const [reviews, ads] = await Promise.all([
    readFile(resolve(directory, "reviews.json"), "utf8"),
    readFile(resolve(directory, "ads.csv"), "utf8"),
  ]);

  return {
    reviews: await importReviews({
      merchantId: options.merchantId,
      input: applyProductIdMap(reviews, options.productIdMap),
      format: "json",
      attribution: "demo",
      repository: options.repository,
    }),
    ads: await importAdPerformance({
      merchantId: options.merchantId,
      input: applyProductIdMap(ads, options.productIdMap),
      format: "csv",
      attribution: "demo",
      repository: options.repository,
    }),
  };
}
