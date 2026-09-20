import { z } from "zod";

/** Server-side adapter contract. Credentials and provider-specific state stay in the adapter. */
export interface TextGenerationRequest {
  instructions: string;
  prompt: string;
  signal: AbortSignal;
}

export interface TextGenerator {
  generateText(request: TextGenerationRequest): Promise<string>;
}

export type GenerationErrorCode =
  | "cancelled" | "timeout" | "provider-failed" | "invalid-output";

export class GenerationError extends Error {
  constructor(readonly code: GenerationErrorCode) {
    super({
      cancelled: "Generation was cancelled.",
      timeout: "Generation timed out. Please try again.",
      "provider-failed": "The text generation service could not complete the request.",
      "invalid-output": "The text generation service returned an invalid result.",
    }[code]);
    this.name = "GenerationError";
  }
}

/** Requires only text generation; JSON/schema support in the provider is optional. */
export async function generateStructuredText<T>(options: {
  generator: TextGenerator;
  schema: z.ZodType<T>;
  instructions: string;
  prompt: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 300_000) {
    throw new RangeError("timeoutMs must be an integer between 1 and 300000");
  }
  if (options.signal?.aborted) throw new GenerationError("cancelled");

  const instructions = `${options.instructions}\nReturn only JSON matching this schema:\n${JSON.stringify(z.toJSONSchema(options.schema))}`;
  const controller = new AbortController();
  const cancel = () => controller.abort(new GenerationError("cancelled"));
  options.signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => controller.abort(new GenerationError("timeout")), timeoutMs);
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(controller.signal.reason);
    controller.signal.addEventListener("abort", onAbort, { once: true });
  });

  try {
    const text = await Promise.race([
      Promise.resolve().then(() => options.generator.generateText({
        instructions, prompt: options.prompt, signal: controller.signal,
      })),
      aborted,
    ]);
    if (controller.signal.aborted) throw controller.signal.reason;
    if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > 262_144) {
      throw new GenerationError("invalid-output");
    }
    // Tolerate a single Markdown fence from text-only providers, never arbitrary prose.
    const json = text.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i, "$1");
    try {
      return options.schema.parse(JSON.parse(json));
    } catch {
      throw new GenerationError("invalid-output");
    }
  } catch (error) {
    if (error instanceof GenerationError) throw error;
    // Do not expose provider errors that may contain credentials or evidence text.
    throw new GenerationError("provider-failed");
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", onAbort);
  }
}
