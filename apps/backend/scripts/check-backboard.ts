/** Live provider check using synthetic repository fixtures, without database writes. */
import "./load-env";
import { createBackboardModelClient } from "../src/ai/model.js";
import { generateCampaign } from "../src/ai/run-generation.js";
import { createMemoryPersistence } from "../src/ai/persist.js";
import { GenerationError } from "../src/ai/errors.js";

const persistence = createMemoryPersistence();
const model = createBackboardModelClient({ provider: process.env.BACKBOARD_PROVIDER, model: process.env.BACKBOARD_MODEL });
try {
  const campaign = await generateCampaign({
    merchantId: "merchant-1", productId: "rain-jacket",
    model,
    persistence, retryAttempts: 1,
  });
  console.log(JSON.stringify({ ok: true, hooks: campaign.hooks.length, captions: campaign.captions.length,
    variants: campaign.variants.length, citations: campaign.supportingSourceIds.length,
    claimReviews: campaign.validationResults.length, status: persistence.runs[0]?.status }));
} catch (error) {
  console.error(JSON.stringify(error instanceof GenerationError
    ? { ok: false, code: error.code, stage: error.stage, message: error.userMessage, details: error.details }
    : { ok: false, message: "Live Backboard check failed." }));
  process.exitCode = 1;
}
