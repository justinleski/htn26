/**
 * Google Analytics access layer (scaffold).
 *
 * Product model: per-merchant OAuth ("Connect Google Analytics").
 * App holds one OAuth client in env; tokens + GA4 property live on MerchantIntegration.
 * This pass does NOT call the GA4 Data API or complete the OAuth consent flow.
 */
import { z } from "zod";
import {
  AdPerformanceSchema,
  MerchantIntegrationSchema,
  type AdPerformance,
  type MerchantIntegration,
} from "../schemas";
import {
  getEnv,
  hasGoogleOAuthClient,
  type AppEnv,
} from "../env.server";

export const GaMetricRowSchema = z
  .object({
    date: z.string().optional(),
    sessions: z.number().optional(),
    users: z.number().optional(),
    pageViews: z.number().optional(),
    conversions: z.number().optional(),
    eventName: z.string().optional(),
    /** Loose GA4 dimension/metric map */
    dimensions: z.record(z.string(), z.unknown()).optional(),
    metrics: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type GaMetricRow = z.infer<typeof GaMetricRowSchema>;

export const GaOAuthTokenShapeSchema = z
  .object({
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    expiresAt: z.union([z.string(), z.date()]).optional(),
    scope: z.string().optional(),
    tokenType: z.string().optional(),
  })
  .passthrough();
export type GaOAuthTokenShape = z.infer<typeof GaOAuthTokenShapeSchema>;

const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
].join(" ");

export type GaOAuthClientConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
};

export function getGaOAuthClientConfig(
  env: AppEnv = getEnv(),
): GaOAuthClientConfig | null {
  if (!hasGoogleOAuthClient(env) || !env.googleRedirectUri) {
    return null;
  }
  return {
    clientId: env.googleClientId!,
    clientSecret: env.googleClientSecret!,
    redirectUri: env.googleRedirectUri,
    scopes: DEFAULT_SCOPES,
  };
}

/**
 * Build the Google consent URL for a merchant. Not wired to a route yet.
 */
export function buildGaAuthorizeUrl(
  state: string,
  config: GaOAuthClientConfig | null = getGaOAuthClientConfig(),
): string | null {
  if (!config) return null;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

/**
 * Shape for storing tokens on MerchantIntegration after OAuth (future).
 */
export function toMerchantIntegrationDraft(input: {
  merchantId: string;
  shop: string;
  propertyId?: string;
  tokens?: GaOAuthTokenShape;
  status?: string;
}): MerchantIntegration {
  return MerchantIntegrationSchema.parse({
    merchantId: input.merchantId,
    shop: input.shop,
    provider: "google_analytics",
    status: input.status ?? (input.tokens?.refreshToken ? "connected" : "disconnected"),
    metadata: {
      propertyId: input.propertyId,
    },
    connectedAt: input.tokens?.refreshToken ? new Date().toISOString() : null,
  });
}

/**
 * Map a loose GA metric row into AdPerformance with source google_analytics.
 * Sync job will call this later — stub for schema/contract only.
 */
export function mapGaRowToAdPerformance(
  row: GaMetricRow,
  ctx: { merchantId: string; productId?: string; propertyId?: string },
): AdPerformance {
  return AdPerformanceSchema.parse({
    merchantId: ctx.merchantId,
    productId: ctx.productId,
    source: "google_analytics",
    channel: "google_analytics",
    campaignId: ctx.propertyId,
    dateStart: row.date,
    dateEnd: row.date,
    impressions: typeof row.sessions === "number" ? row.sessions : undefined,
    clicks: undefined,
    purchases: row.conversions,
    metrics: {
      ...row.metrics,
      users: row.users,
      pageViews: row.pageViews,
      eventName: row.eventName,
      dimensions: row.dimensions,
    },
  });
}

/**
 * Placeholder for GA4 Data API runReport. Throws until OAuth + sync land.
 */
export async function fetchGa4ReportStub(_args: {
  propertyId: string;
  accessToken: string;
  dateRanges?: { startDate: string; endDate: string }[];
}): Promise<GaMetricRow[]> {
  throw new Error(
    "GA4 Data API sync is not implemented yet. Connect OAuth + property first.",
  );
}

export function gaConnectStatus(env: AppEnv = getEnv()): {
  appOAuthConfigured: boolean;
  connectEnabled: boolean;
  message: string;
} {
  const appOAuthConfigured = Boolean(getGaOAuthClientConfig(env));
  return {
    appOAuthConfigured,
    connectEnabled: false,
    message: appOAuthConfigured
      ? "Google OAuth client is configured. Connect flow is not enabled in this build."
      : "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to enable Connect Google Analytics later.",
  };
}
