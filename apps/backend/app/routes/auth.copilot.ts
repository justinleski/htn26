import type { LoaderFunctionArgs } from "react-router";
import { redirectToFrontendInsights } from "../lib/copilot-oauth.server";
import { authenticate } from "../shopify.server";

/**
 * Shopify Admin / login landing. Mint a copilot token and send the merchant
 * to the Vite product. `/app` Polaris routes stay available as debug-only.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return redirectToFrontendInsights(session.shop);
};
