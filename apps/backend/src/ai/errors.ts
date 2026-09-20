export type GenerationErrorCode =
  | "timeout"
  | "provider_unavailable"
  | "schema_parse"
  | "invalid_citations"
  | "insufficient_evidence"
  | "unknown";

export class GenerationError extends Error {
  readonly name = "GenerationError";
  readonly code: GenerationErrorCode;
  readonly stage: string;
  readonly userMessage: string;
  readonly details?: string;

  constructor(options: {
    code: GenerationErrorCode;
    stage: string;
    userMessage: string;
    details?: string;
    cause?: unknown;
  }) {
    super(options.userMessage, { cause: options.cause });
    this.code = options.code;
    this.stage = options.stage;
    this.userMessage = options.userMessage;
    this.details = options.details;
  }
}

export function toUserFacingError(error: unknown, stage: string): GenerationError {
  if (error instanceof GenerationError) return error;
  if (
    (error instanceof Error && /timeout|timed out|abort/i.test(error.message)) ||
    (typeof error === "object" && error !== null && "name" in error && error.name === "TimeoutError")
  ) {
    return new GenerationError({
      code: "timeout",
      stage,
      userMessage: "Campaign generation timed out. Please try again.",
      details: error instanceof Error ? error.message : String(error),
      cause: error,
    });
  }
  return new GenerationError({
    code: "unknown",
    stage,
    userMessage: "Campaign generation failed. Please try again.",
    details: error instanceof Error ? error.message : String(error),
    cause: error,
  });
}
