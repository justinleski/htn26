import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { standaloneAuth } from "../lib/standalone.server";
import { requireSameOrigin } from "../../src/auth/standalone.js";
import { ensureMerchant, loadMerchantDashboard, syncMerchantProducts, importMerchantDemo, importMerchantFile } from "../lib/merchant-data.server";
import prisma from "../db.server";
import { generateMerchantCampaign } from "../lib/campaigns.server";

async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) throw Response.json({ error: "Send JSON." }, { status: 415 });
  const reader = request.body?.getReader();
  if (!reader) throw Response.json({ error: "Missing request body." }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 6 * 1024 * 1024) {
        await reader.cancel();
        throw Response.json({ error: "Upload must be smaller than 5 MB." }, { status: 413 });
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
}
async function dispatch(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  const auth = standaloneAuth();
  if (request.method === "GET" && path === "/api/auth/start") return auth.start(request);
  if (request.method === "GET" && path === "/api/auth/callback") {
    try { return await auth.callback(request); }
    catch { return Response.redirect(`${auth.origin}/?authError=oauth_failed`, 302); }
  }
  if (request.method !== "GET") {
    const frontendOrigin = process.env.NODE_ENV === "production" ? auth.origin : (process.env.FRONTEND_URL ?? auth.origin);
    requireSameOrigin(request, new URL(frontendOrigin).origin);
    if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  }
  if (path === "/api/session" && request.method === "GET") {
    const session = await auth.currentSession(request);
    return Response.json({ connected: Boolean(session), shop: session?.shop ?? null });
  }
  if (path === "/api/logout" && request.method === "POST") return auth.logout(request);
  const session = await auth.requireSession(request);
  if (path === "/api/dashboard" && request.method === "GET") return Response.json(await loadMerchantDashboard(session.shop));
  if (path === "/api/sync" && request.method === "POST") {
    const client = new auth.api.clients.Graphql({ session });
    return Response.json(await syncMerchantProducts(session.shop, {
      graphql: async (query, options) => Response.json(await client.request(query, { variables: options?.variables })),
    }));
  }
  if ((path === "/api/import/demo" || path === "/api/import-demo") && request.method === "POST") return Response.json(await importMerchantDemo(session.shop));
  if (path === "/api/import" && request.method === "POST") return Response.json(await importMerchantFile(session.shop, await readJson(request)));
  const merchant = await ensureMerchant(session.shop);
  if (path === "/api/campaigns" && request.method === "GET") {
    return Response.json(await prisma.campaign.findMany({
      where: { merchantId: merchant.id }, orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, productId: true, objective: true, createdAt: true, product: { select: { title: true } } },
    }));
  }
  if (/^\/api\/campaigns\/[^/]+$/.test(path) && request.method === "GET") {
    const campaign = await prisma.campaign.findFirst({ where: { id: path.split("/").at(-1), merchantId: merchant.id } });
    return campaign ? Response.json(campaign) : Response.json({ error: "Campaign not found." }, { status: 404 });
  }
  if (path === "/api/generate" && request.method === "POST") {
    const body = await readJson(request);
    if (typeof body.productId !== "string" || !body.productId.trim()) return Response.json({ error: "Select a product." }, { status: 400 });
    return Response.json(await generateMerchantCampaign(session.shop, body.productId));
  }
  return Response.json({ error: "Endpoint not found." }, { status: 404 });
}
async function handle(request: Request) {
  let response: Response;
  try { response = await dispatch(request); }
  catch (error) { response = error instanceof Response ? error : Response.json({ error: "The server could not complete this request. Please try again." }, { status: 500 }); }
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, headers });
}
export const loader = ({ request }: LoaderFunctionArgs) => handle(request);
export const action = ({ request }: ActionFunctionArgs) => handle(request);
