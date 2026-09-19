export interface ElasticEnvironment {
  url: string;
  apiKey: string;
}

export interface SentryEnvironment {
  dsn?: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
}

function requiredValue(name: string, environment: NodeJS.ProcessEnv): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  if (value.includes("YOUR_")) throw new Error(`${name} still contains a placeholder`);
  return value;
}

function optionalValue(name: string, environment: NodeJS.ProcessEnv): string | undefined {
  const value = environment[name]?.trim();
  return value && !value.includes("YOUR_") ? value : undefined;
}

function sampleRate(value: string | undefined): number {
  if (!value) return 0.1;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error("SENTRY_TRACES_SAMPLE_RATE must be between 0 and 1");
  }
  return parsed;
}

export function readDatabaseUrl(environment: NodeJS.ProcessEnv = process.env): string {
  const value = requiredValue("DATABASE_URL", environment);
  const url = new URL(value);
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use the postgresql protocol");
  }
  return value;
}

export function readElasticEnvironment(environment: NodeJS.ProcessEnv = process.env): ElasticEnvironment {
  const url = requiredValue("ELASTIC_URL", environment);
  if (new URL(url).protocol !== "https:") throw new Error("ELASTIC_URL must use HTTPS");
  return { url, apiKey: requiredValue("ELASTIC_API_KEY", environment) };
}

export function readSentryEnvironment(environment: NodeJS.ProcessEnv = process.env): SentryEnvironment {
  return {
    dsn: optionalValue("SENTRY_DSN", environment),
    environment: optionalValue("SENTRY_ENVIRONMENT", environment) ?? environment.NODE_ENV ?? "development",
    release: optionalValue("SENTRY_RELEASE", environment),
    tracesSampleRate: sampleRate(environment.SENTRY_TRACES_SAMPLE_RATE),
  };
}
