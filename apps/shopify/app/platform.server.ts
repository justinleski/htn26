import {
  capturePlatformError,
  ensureEvidenceIndex,
  getDatabaseServices,
  getPlatformServices,
  type DatabaseServices,
  type PlatformServices,
} from "@htn26/backend";
import { authenticate } from "./shopify.server";

export async function authenticateMerchant(request: Request): Promise<{
  admin: Awaited<ReturnType<typeof authenticate.admin>>["admin"];
  session: Awaited<ReturnType<typeof authenticate.admin>>["session"];
  merchantId: string;
  database: DatabaseServices;
}> {
  const { admin, session } = await authenticate.admin(request);
  const database = getDatabaseServices();
  const merchant = await database.prisma.merchant.upsert({
    where: { shopDomain: session.shop },
    create: { shopDomain: session.shop },
    update: {},
  });
  return { admin, session, merchantId: merchant.id, database };
}

export async function requireSearchPlatform(): Promise<PlatformServices> {
  const platform = getPlatformServices();
  await ensureEvidenceIndex(platform.elastic);
  return platform;
}

export function reportRouteError(error: unknown, operation: string, merchantId?: string): string {
  capturePlatformError(error, { operation, merchantId });
  return error instanceof Error ? error.message : "Unexpected platform error";
}
