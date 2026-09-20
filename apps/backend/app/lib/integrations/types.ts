/**
 * Integration provider enums and helpers (server + shared shape).
 */
export type IntegrationProviderId = "google_analytics" | "shopify";

export const INTEGRATION_PROVIDERS: IntegrationProviderId[] = [
  "google_analytics",
  "shopify",
];

export function isIntegrationProvider(
  value: string,
): value is IntegrationProviderId {
  return (INTEGRATION_PROVIDERS as string[]).includes(value);
}
