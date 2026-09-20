import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { handleApiRequest } from "../lib/api.server";
import { unauthenticated } from "../shopify.server";

const SHOP_NAME_QUERY = `#graphql
  query CopilotShopName {
    shop {
      name
      myshopifyDomain
    }
  }
`;

async function loadMerchantSessionStatus(shop: string) {
  const fallbackName = shop.replace(/\.myshopify\.com$/i, "");
  try {
    const { admin, session } = await unauthenticated.admin(shop);
    const connected = Boolean(session.accessToken);
    const response = await admin.graphql(SHOP_NAME_QUERY);
    const json = (await response.json()) as {
      data?: { shop?: { name?: string; myshopifyDomain?: string } };
    };
    return {
      connected,
      shop: json.data?.shop?.myshopifyDomain ?? shop,
      storeName: json.data?.shop?.name?.trim() || fallbackName,
    };
  } catch {
    return { connected: false, shop, storeName: fallbackName };
  }
}

async function sessionApi({ request }: LoaderFunctionArgs | ActionFunctionArgs) {
  return handleApiRequest(
    request,
    async ({ session }) => {
      const body = await loadMerchantSessionStatus(session.shop);
      return Response.json({
        connected: body.connected,
        shop: body.shop,
        storeName: body.storeName,
      });
    },
    { methods: ["GET"] },
  );
}

export const loader = sessionApi;
export const action = sessionApi;
