import { GenerationError } from "./errors.js";

export class TimeoutError extends Error {
  readonly name = "TimeoutError";
  constructor(message: string) {
    super(message);
  }
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new GenerationError({
            code: "timeout",
            stage: "model",
            userMessage: "Campaign generation timed out. Please try again.",
            details: message,
          }),
        ),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  if (error instanceof GenerationError) {
    return error.code === "timeout" || error.code === "provider_unavailable" || error.code === "schema_parse";
  }
  if (typeof error === "object" && error !== null) {
    const status = "status" in error ? Number((error as { status?: unknown }).status) : NaN;
    if (status === 429 || status >= 500) return true;
  }
  if (error instanceof Error) {
    return /ECONNRESET|ENOTFOUND|EAI_AGAIN|fetch failed|network|429|500|502|503|timeout/i.test(error.message);
  }
  return false;
}

export async function withBoundedRetries<T>(
  operation: () => Promise<T>,
  options: {
    attempts: number;
    delayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  },
): Promise<T> {
  const attempts = Math.max(1, options.attempts);
  const shouldRetry = options.shouldRetry ?? isRetryableError;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !shouldRetry(error)) throw error;
      if (options.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }
    }
  }
  throw lastError;
}
