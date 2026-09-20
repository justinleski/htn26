import { CampaignSchema, type Campaign, type CheckClaims, type GenerateCampaign } from "../schemas.js";
import { analyzeEvidence } from "./analyze-evidence.js";
import { checkClaims } from "./check-claims.js";
import { GenerationError, toUserFacingError } from "./errors.js";
import { generateCampaignDraft } from "./generate-campaign.js";
import { DEFAULT_OPENAI_TIMEOUT_MS, type ModelClient } from "./model.js";
import type { CampaignPersistence } from "./persist.js";
import { TimeoutError, withBoundedRetries, withTimeout } from "./reliability.js";
import { createFixtureEvidenceRetriever, type EvidenceRetriever } from "./retrieve-evidence.js";

export interface GenerateCampaignPipelineInput {
  merchantId: string;
  productId: string;
  model: ModelClient;
  persistence: CampaignPersistence;
  retrieveEvidence?: EvidenceRetriever;
  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

function guardModel(model: ModelClient, timeoutMs: number, retryAttempts: number, retryDelayMs: number): ModelClient {
  return {
    async completeJson(options) {
      try {
        return await withBoundedRetries(
          () => withTimeout(
            model.completeJson({ ...options, timeoutMs }),
            timeoutMs,
            "OpenAI request timed out",
          ),
          { attempts: retryAttempts, delayMs: retryDelayMs },
        );
      } catch (error) {
        if (error instanceof TimeoutError) {
          throw new GenerationError({
            code: "timeout",
            stage: "model",
            userMessage: "Campaign generation timed out. Please try again.",
            details: error.message,
            cause: error,
          });
        }
        throw error;
      }
    },
  };
}

export async function generateCampaign(input: GenerateCampaignPipelineInput): Promise<Campaign> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_OPENAI_TIMEOUT_MS;
  const model = guardModel(input.model, timeoutMs, input.retryAttempts ?? 2, input.retryDelayMs ?? 250);
  const retrieve = input.retrieveEvidence ?? createFixtureEvidenceRetriever();
  const run = await input.persistence.createGenerationRun({ merchantId: input.merchantId });

  try {
    const evidence = await retrieve({ merchantId: input.merchantId, productId: input.productId });
    const analysis = await analyzeEvidence({
      merchantId: input.merchantId,
      productId: input.productId,
      evidence: evidence.records,
      model,
      timeoutMs,
    });
    const draft = await generateCampaignDraft({
      merchantId: input.merchantId,
      productId: input.productId,
      evidence: evidence.records,
      findings: analysis,
      model,
      timeoutMs,
    });
    const claims = await checkClaims({
      merchantId: input.merchantId,
      productId: input.productId,
      campaign: draft,
      evidence: evidence.records,
      model,
      timeoutMs,
    });
    const campaign = await persistCheckedCampaign(input, claims.campaign, claims);
    await input.persistence.finishGenerationRun({
      id: run.id,
      status: "succeeded",
      campaignId: campaign.id,
      errorDetails: null,
    });
    return campaign;
  } catch (error) {
    const generationError = toUserFacingError(error, "generate");
    await input.persistence.finishGenerationRun({
      id: run.id,
      status: "failed",
      campaignId: null,
      errorDetails: generationError.userMessage,
    });
    throw generationError;
  }
}

async function persistCheckedCampaign(
  input: GenerateCampaignPipelineInput,
  draft: GenerateCampaign,
  claims: CheckClaims,
): Promise<Campaign> {
  const validationResults = claims.decisions.map((decision) => {
    const rewrite = decision.rewrittenClaim ? ` rewrite=${decision.rewrittenClaim}` : "";
    return `${decision.status}: ${decision.claim} (${decision.reason})${rewrite}`;
  });
  return input.persistence.createCampaign(
    CampaignSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse({
      merchantId: input.merchantId,
      productId: input.productId,
      objective: draft.objective,
      audience: draft.audience,
      strategy: draft.strategy,
      hooks: draft.hooks,
      captions: draft.captions,
      variants: draft.variants,
      supportingSourceIds: draft.supportingSourceIds,
      validationResults,
    }),
  );
}
