import type { ActionFunctionArgs } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session } = await authenticate.webhook(request);
  if (session) {
    await prisma.session.update({ where: { id: session.id }, data: { scope: (payload.current as string[]).join(",") } });
  }
  return new Response();
};
