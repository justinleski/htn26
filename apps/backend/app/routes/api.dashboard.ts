import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { handleApiRequest } from "../lib/api.server";
import { loadMerchantDashboard } from "../lib/merchant-data.server";

async function dashboardApi({ request }: LoaderFunctionArgs | ActionFunctionArgs) {
  return handleApiRequest(
    request,
    async ({ session }) => {
      const dashboard = await loadMerchantDashboard(session.shop);
      return Response.json(dashboard);
    },
    { methods: ["GET"] },
  );
}

export const loader = dashboardApi;
export const action = dashboardApi;
