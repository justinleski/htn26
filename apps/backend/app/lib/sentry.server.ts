/**
 * Sentry init — light stub. Expand tracing when sync/import/AI land.
 */
import * as Sentry from "@sentry/node";
import { getEnv, hasSentry } from "./env.server";

let initialized = false;

export function initSentry(): boolean {
  if (initialized) return true;
  const env = getEnv();
  if (!hasSentry(env)) return false;
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.sentryEnvironment,
    tracesSampleRate: env.nodeEnv === "production" ? 0.2 : 1.0,
  });
  initialized = true;
  return true;
}

export type SentryHealth = {
  configured: boolean;
  initialized: boolean;
};

export function checkSentryHealth(): SentryHealth {
  const configured = hasSentry();
  if (configured && !initialized) {
    initSentry();
  }
  return { configured, initialized };
}

export function captureTestEvent(message = "htn26 health check"): string | undefined {
  if (!initSentry()) return undefined;
  return Sentry.captureMessage(message, "info");
}

export { Sentry };
