import { AnalyzeEvidenceSchema, GenerateCampaignSchema, type AnalyzeEvidence, type GenerateCampaign } from "../schemas.js";
import { GenerationError } from "./errors.js";
import { parseStageOutput } from "./model.js";

export function filterIds(ids: string[], known: Set<string>): string[] {
  return [...new Set(ids.filter((id) => known.has(id)))];
}

export function sanitizeAnalyzeEvidence(analysis: AnalyzeEvidence, known: Set<string>): AnalyzeEvidence {
  const findings = analysis.findings
    .map((finding) => ({
      ...finding,
      supportingSourceIds: filterIds(finding.supportingSourceIds, known),
    }))
    .filter((finding) => finding.supportingSourceIds.length > 0);

  if (findings.length === 0) {
    throw new GenerationError({
      code: "invalid_citations",
      stage: "analyze",
      userMessage: "Campaign generation cited evidence that does not exist. Please try again.",
    });
  }

  return parseStageOutput(
    AnalyzeEvidenceSchema,
    {
      ...analysis,
      findings,
    },
    "analyze",
  );
}

export function sanitizeGenerateCampaign(campaign: GenerateCampaign, known: Set<string>): GenerateCampaign {
  const supportingSourceIds = filterIds(campaign.supportingSourceIds, known);
  if (supportingSourceIds.length === 0) {
    throw new GenerationError({
      code: "invalid_citations",
      stage: "generate",
      userMessage: "Campaign generation cited evidence that does not exist. Please try again.",
    });
  }
  return parseStageOutput(
    GenerateCampaignSchema,
    {
      ...campaign,
      supportingSourceIds,
    },
    "generate",
  );
}

export function replaceClaimText(text: string, claim: string, replacement: string): string {
  if (!claim) return text;
  return text.split(claim).join(replacement);
}

export function fallbackCopy(label: string): string {
  return `${label} limited to verified product evidence.`;
}

export function applyTextReplacement<T extends GenerateCampaign>(campaign: T, claim: string, replacement: string): T {
  const nextReplacement = replacement.trim() || fallbackCopy("Messaging");
  return {
    ...campaign,
    strategy: replaceClaimText(campaign.strategy, claim, nextReplacement) || fallbackCopy("Strategy"),
    audience: replaceClaimText(campaign.audience, claim, nextReplacement) || fallbackCopy("Audience"),
    objective: replaceClaimText(campaign.objective, claim, nextReplacement) || fallbackCopy("Objective"),
    hooks: campaign.hooks.map((hook, index) => replaceClaimText(hook, claim, nextReplacement) || fallbackCopy(`Hook ${index + 1}`)),
    captions: campaign.captions.map((caption, index) => replaceClaimText(caption, claim, nextReplacement) || fallbackCopy(`Caption ${index + 1}`)),
    variants: campaign.variants.map((variant, index) => ({
      ...variant,
      content: replaceClaimText(variant.content, claim, nextReplacement) || fallbackCopy(`Variant ${index + 1}`),
      hypothesis: replaceClaimText(variant.hypothesis, claim, nextReplacement) || variant.hypothesis,
    })),
  };
}
