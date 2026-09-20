/**
 * Server-only env helpers. Never import this from client bundles.
 * Values may be empty during early scaffold — callers should handle missing config.
 */

export type AppEnv = {
  shopifyApiKey: string | undefined;
  shopifyApiSecret: string | undefined;
  scopes: string[];
  shopifyAppUrl: string | undefined;
  databaseUrl: string | undefined;
  sessionSecret: string | undefined;
  elasticUrl: string | undefined;
  elasticApiKey: string | undefined;
  sentryDsn: string | undefined;
  sentryEnvironment: string;
  backboardApiKey: string | undefined;
  googleClientId: string | undefined;
  googleClientSecret: string | undefined;
  googleRedirectUri: string | undefined;
  gaDefaultPropertyId: string | undefined;
  nodeEnv: string;
  port: number;
};

export function getEnv(): AppEnv {
  return {
    shopifyApiKey: process.env.SHOPIFY_API_KEY || undefined,
    shopifyApiSecret: process.env.SHOPIFY_API_SECRET || undefined,
    scopes: (process.env.SCOPES || "write_products,read_products")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    shopifyAppUrl: process.env.SHOPIFY_APP_URL || undefined,
    databaseUrl: process.env.DATABASE_URL || undefined,
    sessionSecret: process.env.SESSION_SECRET || undefined,
    elasticUrl: process.env.ELASTIC_URL || undefined,
    elasticApiKey: process.env.ELASTIC_API_KEY || undefined,
    sentryDsn: process.env.SENTRY_DSN || undefined,
    sentryEnvironment:
      process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    backboardApiKey: process.env.BACKBOARD_API_KEY || undefined,
    googleClientId: process.env.GOOGLE_CLIENT_ID || undefined,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || undefined,
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || undefined,
    gaDefaultPropertyId: process.env.GA_DEFAULT_PROPERTY_ID || undefined,
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 3000),
  };
}

export function hasShopifyCredentials(env = getEnv()): boolean {
  return Boolean(env.shopifyApiKey && env.shopifyApiSecret);
}

export function hasGoogleOAuthClient(env = getEnv()): boolean {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

export function hasElastic(env = getEnv()): boolean {
  return Boolean(env.elasticUrl && env.elasticApiKey);
}

export function hasSentry(env = getEnv()): boolean {
  return Boolean(env.sentryDsn);
}

export function hasBackboard(env = getEnv()): boolean {
  return Boolean(env.backboardApiKey);
}
