import * as Sentry from "@sentry/node";
import { readSentryEnvironment } from "../runtime/environment.js";

let initialized = false;

export function initializeSentry(environment: NodeJS.ProcessEnv = process.env): boolean {
  if (initialized) return Boolean(Sentry.getClient());
  initialized = true;
  const config = readSentryEnvironment(environment);
  if (!config.dsn) return false;
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
  });
  return true;
}

export function capturePlatformError(
  error: unknown,
  context: { operation: string; merchantId?: string },
): string | undefined {
  if (!Sentry.getClient()) return undefined;
  return Sentry.withScope((scope) => {
    scope.setTag("operation", context.operation);
    if (context.merchantId) scope.setTag("merchantId", context.merchantId);
    return Sentry.captureException(error);
  });
}

export async function withPlatformSpan<T>(
  operation: string,
  callback: () => Promise<T>,
): Promise<T> {
  if (!Sentry.getClient()) return callback();
  return Sentry.startSpan({ name: operation, op: "platform.operation" }, callback);
}
