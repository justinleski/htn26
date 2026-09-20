import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { beginStandaloneOAuth, completeStandaloneOAuth } from "../../lib/standalone-oauth.server";

// The standalone frontend owns login UI and assets on the canonical origin.
export const loader = ({ request }: LoaderFunctionArgs) => completeStandaloneOAuth(request);

export const action = async ({ request }: ActionFunctionArgs) => {
  const shop = new URL(request.url).searchParams.get("shop") ?? (await request.formData()).get("shop");
  if (typeof shop === "string" && shop.trim()) return beginStandaloneOAuth(request, shop);
  return completeStandaloneOAuth(request);
};
