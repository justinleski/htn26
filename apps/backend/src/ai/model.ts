import { z } from "zod";
import { generateStructuredText, type TextGenerator } from "../generation/text.js";
import { GenerationError } from "./errors.js";
import { GenerationError as TextGenerationError } from "../generation/text.js";
import { TimeoutError, withBoundedRetries, withTimeout } from "./reliability.js";

export interface ModelCompleteOptions {
  system: string;
  user: string;
  timeoutMs?: number;
}

export interface ModelClient {
  completeJson(options: ModelCompleteOptions): Promise<unknown>;
}

/** Adapts any prompt-to-text provider to the pipeline; no native JSON mode required. */
export function createTextModelClient(generator: TextGenerator): ModelClient {
  return {
    async completeJson(request) {
      try {
        return await generateStructuredText({ generator, schema: z.unknown(), instructions: request.system, prompt: request.user, timeoutMs: request.timeoutMs });
      } catch (error) {
        if (error instanceof TextGenerationError) throw new GenerationError({
          code: error.code === "timeout" ? "timeout" : error.code === "invalid-output" ? "schema_parse" : "provider_unavailable",
          stage: "model", userMessage: error.message,
        });
        throw error;
      }
    },
  };
}

export const DEFAULT_BACKBOARD_TIMEOUT_MS = 45_000;
export const DEFAULT_BACKBOARD_ATTEMPTS = 1;
export const DEFAULT_BACKBOARD_BASE_URL = "https://app.backboard.io/api";

// Keep routine generation on a low-cost model with reliable JSON output. Change this constant to
// FRONTIER_BACKBOARD_MODEL when quality matters more than inference cost.
export const DEFAULT_BACKBOARD_MODEL = {
  provider: "openrouter",
  model: "openai/gpt-4o-mini",
} as const;

export const FRONTIER_BACKBOARD_MODEL = {
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
} as const;

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new GenerationError({
      code: "schema_parse",
      stage: "model",
      userMessage: "The campaign generator returned an unexpected format. Please try again.",
      details: error instanceof Error ? error.message : String(error),
      cause: error,
    });
  }
}

export function parseStageOutput<T>(schema: z.ZodType<T>, data: unknown, stage: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new GenerationError({
      code: "schema_parse",
      stage,
      userMessage: "The campaign generator returned an unexpected format. Please try again.",
      details: result.error.message,
    });
  }
  return result.data;
}

export function createScriptedModelClient(replies: Array<unknown | (() => Promise<unknown>)>): ModelClient {
  let index = 0;
  return {
    async completeJson() {
      const reply = replies[index];
      index += 1;
      if (reply === undefined) {
        throw new GenerationError({
          code: "unknown",
          stage: "model",
          userMessage: "Campaign generation failed. Please try again.",
          details: "The model client received more calls than scripted replies.",
        });
      }
      return typeof reply === "function" ? await reply() : reply;
    },
  };
}

export interface BackboardModelClientOptions {
  apiKey?: string;
  baseUrl?: string;
  provider?: string;
  model?: string;
  timeoutMs?: number;
  attempts?: number;
  delayMs?: number;
}

interface BackboardMessageResponse {
  content?: string | null;
}

export function createBackboardModelClient(options: BackboardModelClientOptions = {}): ModelClient {
  const timeoutMs = options.timeoutMs ?? DEFAULT_BACKBOARD_TIMEOUT_MS;
  const attempts = options.attempts ?? DEFAULT_BACKBOARD_ATTEMPTS;
  const provider = options.provider ?? DEFAULT_BACKBOARD_MODEL.provider;
  const model = options.model ?? DEFAULT_BACKBOARD_MODEL.model;
  const baseUrl = options.baseUrl ?? DEFAULT_BACKBOARD_BASE_URL;

  return {
    async completeJson(request) {
      const apiKey = options.apiKey ?? process.env.BACKBOARD_API_KEY;
      if (!apiKey) {
        throw new GenerationError({
          code: "provider_unavailable",
          stage: "model",
          userMessage: "Campaign generation is unavailable because Backboard is not configured.",
        });
      }

      return withBoundedRetries(
        async () => {
          const callTimeout = request.timeoutMs ?? timeoutMs;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), callTimeout);
          try {
            const response = await withTimeout(
              fetch(`${baseUrl}/threads/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
                body: JSON.stringify({
                  content: request.user,
                  system_prompt: request.system,
                  llm_provider: provider,
                  model_name: model,
                  stream: false,
                  json_output: true,
                  memory: "off",
                  web_search: "off",
                }),
                signal: controller.signal,
              }),
              callTimeout,
              "Backboard request timed out",
            );
            if (!response.ok) {
              throw new Error(`Backboard request failed with status ${response.status}`);
            }
            const result = (await response.json()) as BackboardMessageResponse;
            const text = result.content?.trim();
            if (text?.startsWith("LLM Error:")) {
              throw new GenerationError({
                code: "provider_unavailable", stage: "model",
                userMessage: "Backboard could not run the configured model. Check the model configuration and try again.",
              });
            }
            if (!text) {
              throw new GenerationError({
                code: "schema_parse",
                stage: "model",
                userMessage: "The campaign generator returned an unexpected format. Please try again.",
                details: "Backboard response did not include content.",
              });
            }
            return extractJson(text);
          } catch (error) {
            if (error instanceof GenerationError) throw error;
            if (error instanceof TimeoutError || controller.signal.aborted) {
              throw new GenerationError({
                code: "timeout",
                stage: "model",
                userMessage: "Campaign generation timed out. Please try again.",
                details: "Backboard request exceeded its timeout.",
                cause: error,
              });
            }
            throw new GenerationError({
              code: "provider_unavailable",
              stage: "model",
              userMessage: "Campaign generation is unavailable because Backboard failed. Please try again.",
              details: error instanceof Error ? error.message : String(error),
              cause: error,
            });
          } finally {
            clearTimeout(timer);
          }
        },
        { attempts, delayMs: options.delayMs ?? 250 },
      );
    },
  };
}
