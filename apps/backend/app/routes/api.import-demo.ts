import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { handleApiRequest } from "../lib/api.server";
import { actionError, importMerchantDemo } from "../lib/merchant-data.server";

async function importDemoApi({ request }: LoaderFunctionArgs | ActionFunctionArgs) {
  return handleApiRequest(
    request,
    async ({ session }) => {
      try {
        const result = await importMerchantDemo(session.shop);
        return Response.json(result);
      } catch (error) {
        return Response.json(actionError("import-demo", error), { status: 500 });
      }
    },
    { methods: ["POST"] },
  );
}

export const loader = importDemoApi;
export const action = importDemoApi;
