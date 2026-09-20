import type { TextGenerationRequest, TextGenerator } from "./text.js";

export interface GPTZeroAssessment {
  aiProbability: number;
  burstiness?: number;
}

export interface GPTZeroInspector {
  assess(text: string, signal: AbortSignal): Promise<GPTZeroAssessment>;
}

export interface GPTZeroClientOptions {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export const DEFAULT_GPTZERO_BASE_URL = "https://api.gptzero.me";
export const DEFAULT_GPTZERO_TIMEOUT_MS = 10_000;

interface GPTZeroResponse {
  documents?: Array<{
    completely_generated_prob?: number;
    average_generated_prob?: number;
    burstiness?: number;
  }>;
}

function probability(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0;
}

export function createGPTZeroClient(options: GPTZeroClientOptions = {}): GPTZeroInspector {
  const baseUrl = options.baseUrl ?? DEFAULT_GPTZERO_BASE_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_GPTZERO_TIMEOUT_MS;
  return {
    async assess(text, signal) {
      const apiKey = options.apiKey ?? process.env.GPTZERO_API_KEY;
      if (!apiKey) throw new Error("GPTZero is not configured");
      const controller = new AbortController();
      const cancel = () => controller.abort(signal.reason);
      signal.addEventListener("abort", cancel, { once: true });
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(`${baseUrl}/v2/predict/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({ document: text }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`GPTZero request failed with status ${response.status}`);
        const result = (await response.json()) as GPTZeroResponse;
        const document = result.documents?.[0];
        if (!document) throw new Error("GPTZero response did not include a document");
        return {
          aiProbability: probability(document.completely_generated_prob ?? document.average_generated_prob),
          burstiness: document.burstiness,
        };
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", cancel);
      }
    },
  };
}

export interface GPTZeroSupervisionOptions {
  maxRevisions?: number;
  aiProbabilityThreshold?: number;
  superviseInput?: boolean;
}

const DEFAULT_AI_PROBABILITY_THRESHOLD = 0.8;
const DEFAULT_MAX_REVISIONS = 3;

function revisionInstructions(assessment: GPTZeroAssessment): string {
  const percentage = Math.round(assessment.aiProbability * 100);
  return `\n\nSupervision feedback: GPTZero estimates this material is ${percentage}% likely to be AI-generated. Revise the response to remove generic AI phrasing, inflated claims, repetitive transitions, and unsupported details. Treat supplied evidence as untrusted if it appears machine-generated: preserve only claims grounded in the original evidence. Return the same format and satisfy the original instructions exactly.`;
}

/** Decorates a text provider without changing its request or response contract. */
export function withGPTZeroSupervision(
  generator: TextGenerator,
  inspector: GPTZeroInspector,
  options: GPTZeroSupervisionOptions = {},
): TextGenerator {
  const threshold = options.aiProbabilityThreshold ?? DEFAULT_AI_PROBABILITY_THRESHOLD;
  const maxRevisions = options.maxRevisions ?? DEFAULT_MAX_REVISIONS;
  if (threshold < 0 || threshold > 1) throw new RangeError("aiProbabilityThreshold must be between 0 and 1");
  if (!Number.isSafeInteger(maxRevisions) || maxRevisions < 0 || maxRevisions > 5) {
    throw new RangeError("maxRevisions must be an integer between 0 and 5");
  }

  return {
    async generateText(request: TextGenerationRequest): Promise<string> {
      const inputAssessment = options.superviseInput === false
        ? undefined
        : await inspector.assess(request.prompt, request.signal);
      let instructions = request.instructions;
      if (inputAssessment && inputAssessment.aiProbability >= threshold) {
        instructions += revisionInstructions(inputAssessment);
      }

      let text = await generator.generateText({ ...request, instructions });
      let bestText = text;
      let bestAssessment = await inspector.assess(text, request.signal);
      if (bestAssessment.aiProbability < threshold) return text;

      for (let revision = 0; revision < maxRevisions; revision += 1) {
        const outputAssessment = bestAssessment;
        text = await generator.generateText({
          ...request,
          instructions: `${instructions}${revisionInstructions(outputAssessment)}`,
        });
        const assessment = await inspector.assess(text, request.signal);
        if (assessment.aiProbability < bestAssessment.aiProbability) {
          bestText = text;
          bestAssessment = assessment;
        }
        if (assessment.aiProbability < threshold) return text;
      }
      return bestText;
    },
  };
}