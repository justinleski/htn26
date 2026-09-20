import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { beginStandaloneOAuth } from "../lib/standalone-oauth.server";

/**
 * Standalone Connect landing.
 * Do NOT call authenticate.admin here — that triggers an embedded-app bounce
 * loop (Admin ↔ app) when Partner config has embedded=false.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) {
    throw redirect("/auth/login");
  }
  return beginStandaloneOAuth(request, shop);
};
