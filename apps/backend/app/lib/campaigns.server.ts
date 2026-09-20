import prisma from "../db.server";
import { ensureMerchant } from "./merchant-data.server";
import { createPrismaRepositories, type PrismaDataClient } from "../../src/database/prisma-repositories.js";
import { createPrismaCampaignPersistence, type PrismaCampaignClient } from "../../src/ai/persist.js";
import { createBackboardModelClient, type ModelClient } from "../../src/ai/model.js";
import { getEnv } from "./env.server";
import { generateCampaign } from "../../src/ai/run-generation.js";
import { GenerationError } from "../../src/ai/errors.js";
import { traceAppOperation } from "./sentry.server";

export async function generateMerchantCampaign(shop: string, productId: string, model?: ModelClient) {
  const env = getEnv();
  if (!model && !process.env.BACKBOARD_API_KEY) {
    throw Response.json({ error: "Campaign generation is not configured yet." }, { status: 503 });
  }
  const merchant = await ensureMerchant(shop);
  const repository = createPrismaRepositories(prisma as unknown as PrismaDataClient);
  const [products, ads, reviews] = await Promise.all([
    repository.listProducts({ merchantId: merchant.id }),
    repository.listAdPerformance({ merchantId: merchant.id, productId }),
    repository.listReviews({ merchantId: merchant.id }),
  ]);
  const product = products.find((row) => row.id === productId);
  if (!product) throw Response.json({ error: "Product not found in your store." }, { status: 404 });
  const productReviews = reviews.filter((row) => row.productId === productId);
  if (!ads.length && !productReviews.length) throw Response.json({ error: "Import reviews or ad history for this product first." }, { status: 422 });
  try {
    return await traceAppOperation("campaign.generate", () => generateCampaign({
      merchantId: merchant.id, productId,
      model: model ?? createBackboardModelClient({ apiKey: env.backboardApiKey, gptZeroApiKey: env.gptZeroApiKey, provider: process.env.BACKBOARD_PROVIDER, model: process.env.BACKBOARD_MODEL }),
      persistence: createPrismaCampaignPersistence(prisma as unknown as PrismaCampaignClient),
      retryAttempts: 1,
      // Explicit production retrieval: never fall back to the AI lane's fixtures.
      retrieveEvidence: async () => ({ merchantId: merchant.id, productId, product, ads, reviews: productReviews, records: [product, ...productReviews, ...ads] }),
    }));
  } catch (error) {
    if (error instanceof GenerationError) {
      console.error("Campaign generation failed", { code: error.code, stage: error.stage, details: error.details });
      throw Response.json({ error: error.userMessage }, { status: 502 });
    }
    throw error;
  }
}
