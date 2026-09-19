import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  importAdPerformance,
  importReviews,
  type AdPerformanceUpsert,
  type DataImportRepository,
  type ImportResult,
  type ReviewUpsert,
} from "../import/importer.js";
import type { ProductRepository, ProductUpsert } from "../shopify/products.js";

interface DemoProductFile {
  id: string;
  shopifyId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  attributes: Record<string, unknown>;
  sourceUpdatedAt: string;
}

export async function loadDemoDataset(options: {
  merchantId: string;
  repository: DataImportRepository;
  productRepository?: ProductRepository;
  demoDirectory?: string;
}): Promise<{
  product?: ProductUpsert;
  reviews: ImportResult<ReviewUpsert>;
  ads: ImportResult<AdPerformanceUpsert>;
}> {
  const directory = options.demoDirectory ?? resolve(process.cwd(), "data", "demo");
  const [reviews, ads] = await Promise.all([
    readFile(resolve(directory, "reviews.json"), "utf8"),
    readFile(resolve(directory, "ads.csv"), "utf8"),
  ]);

  let product: ProductUpsert | undefined;
  if (options.productRepository) {
    const parsed = JSON.parse(await readFile(resolve(directory, "product.json"), "utf8")) as DemoProductFile;
    product = { ...parsed, merchantId: options.merchantId };
    await options.productRepository.upsertProducts([product]);
  }

  return {
    ...(product ? { product } : {}),
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
