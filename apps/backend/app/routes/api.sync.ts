import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { handleApiRequest } from "../lib/api.server";
import { actionError, syncMerchantProducts } from "../lib/merchant-data.server";
import { unauthorizedJson } from "../lib/copilot-session.server";
import { unauthenticated } from "../shopify.server";

async function syncApi({ request }: LoaderFunctionArgs | ActionFunctionArgs) {
  return handleApiRequest(
    request,
    async ({ session }) => {
      try {
        const { admin } = await unauthenticated.admin(session.shop);
        const result = await syncMerchantProducts(session.shop, admin);
        return Response.json(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/could not find a session/i.test(message)) {
          return unauthorizedJson("Shopify session missing. Reconnect the shop.");
        }
        return Response.json(actionError("sync", error), { status: 500 });
      }
    },
    { methods: ["POST"] },
  );
}

export const loader = syncApi;
export const action = syncApi;
