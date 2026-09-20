import type { LoaderFunctionArgs } from "react-router";

import { completeStandaloneOAuth } from "../lib/standalone-oauth.server";

/**
 * Classic OAuth callback for the standalone Vite product.
 * Must be a concrete route so it wins over auth.$.tsx (embedded auth splat).
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  return completeStandaloneOAuth(request);
};
