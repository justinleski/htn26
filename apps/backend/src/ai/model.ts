import { z } from "zod";
import { GenerationError } from "./errors.js";
import { TimeoutError, withBoundedRetries, withTimeout } from "./reliability.js";

export interface ModelCompleteOptions {
  system: string;
  user: string;
  timeoutMs?: number;
}

export interface ModelClient {
  completeJson(options: ModelCompleteOptions): Promise<unknown>;
}

export const DEFAULT_OPENAI_TIMEOUT_MS = 20_000;
export const DEFAULT_OPENAI_ATTEMPTS = 1;

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

export interface OpenAIModelClientOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  attempts?: number;
  delayMs?: number;
}

interface OpenAIResponsesClient {
  responses: {
    create(
      body: {
        model: string;
        input: Array<{ role: string; content: string }>;
        text: { format: { type: "json_object" } };
      },
      request: { timeout: number },
    ): Promise<{ output_text?: string }>;
  };
}

export function createOpenAIModelClient(options: OpenAIModelClientOptions = {}): ModelClient {
  const timeoutMs = options.timeoutMs ?? DEFAULT_OPENAI_TIMEOUT_MS;
  const attempts = options.attempts ?? DEFAULT_OPENAI_ATTEMPTS;
  const model = options.model ?? "gpt-4o-mini";

  return {
    async completeJson(request) {
      const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new GenerationError({
          code: "provider_unavailable",
          stage: "model",
          userMessage: "Campaign generation is unavailable because the AI service is not configured.",
        });
      }

      return withBoundedRetries(
        async () => {
          const callTimeout = request.timeoutMs ?? timeoutMs;
          try {
            const { default: OpenAI } = await import("openai");
            const client = new OpenAI({ apiKey, maxRetries: 0, timeout: callTimeout }) as unknown as OpenAIResponsesClient;
            const response = await withTimeout(
              client.responses.create(
                {
                  model,
                  input: [
                    { role: "developer", content: request.system },
                    { role: "user", content: request.user },
                  ],
                  text: { format: { type: "json_object" } },
                },
                { timeout: callTimeout },
              ),
              callTimeout,
              "OpenAI request timed out",
            );
            const text = response.output_text?.trim();
            if (!text) {
              throw new GenerationError({
                code: "schema_parse",
                stage: "model",
                userMessage: "The campaign generator returned an unexpected format. Please try again.",
                details: "OpenAI response did not include output text.",
              });
            }
            return extractJson(text);
          } catch (error) {
            if (error instanceof GenerationError) throw error;
            if (error instanceof TimeoutError) {
              throw new GenerationError({
                code: "timeout",
                stage: "model",
                userMessage: "Campaign generation timed out. Please try again.",
                details: error.message,
                cause: error,
              });
            }
            throw new GenerationError({
              code: "provider_unavailable",
              stage: "model",
              userMessage: "Campaign generation is unavailable because the AI service failed. Please try again.",
              details: error instanceof Error ? error.message : String(error),
              cause: error,
            });
          }
        },
        { attempts, delayMs: options.delayMs ?? 250 },
      );
    },
  };
}
