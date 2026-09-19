import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  importAdPerformance,
  importReviews,
  type DataImportRepository,
  type ImportResult,
} from "../import/importer.js";

export async function loadDemoDataset(options: {
  merchantId: string;
  repository: DataImportRepository;
  demoDirectory?: string;
}): Promise<{ reviews: ImportResult; ads: ImportResult }> {
  const directory = options.demoDirectory ?? resolve(process.cwd(), "data", "demo");
  const [reviews, ads] = await Promise.all([
    readFile(resolve(directory, "reviews.json"), "utf8"),
    readFile(resolve(directory, "ads.csv"), "utf8"),
  ]);

  return {
    reviews: await importReviews({
      merchantId: options.merchantId,
      input: reviews,
      format: "json",
      attribution: "demo",
      repository: options.repository,
    }),
    ads: await importAdPerformance({
      merchantId: options.merchantId,
      input: ads,
      format: "csv",
      attribution: "demo",
      repository: options.repository,
    }),
  };
}
