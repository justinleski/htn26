import { redirect } from "react-router";
import { ensureMerchant } from "./merchant-data.server";
import { signCopilotSession } from "./copilot-session.server";
import { getFrontendUrl } from "./cors.server";

export function buildInsightsRedirectUrl(token: string): string {
  const url = new URL("/insights", `${getFrontendUrl()}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

/** After Shopify OAuth, send the merchant to the Vite product with a copilot token. */
export async function redirectToFrontendInsights(shop: string): Promise<Response> {
  const merchant = await ensureMerchant(shop);
  const token = signCopilotSession({
    shop,
    merchantId: merchant.id,
  });
  return redirect(buildInsightsRedirectUrl(token));
}
