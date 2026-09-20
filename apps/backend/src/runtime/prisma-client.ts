import { PrismaClient } from "@prisma/client";
import { readDatabaseUrl } from "./environment.js";

declare global {
  var htn26Prisma: PrismaClient | undefined;
}

export function createPrismaClient(environment: NodeJS.ProcessEnv = process.env): PrismaClient {
  const databaseUrl = readDatabaseUrl(environment);
  return new PrismaClient({ datasourceUrl: databaseUrl });
}

export function getPrismaClient(): PrismaClient {
  if (!globalThis.htn26Prisma) globalThis.htn26Prisma = createPrismaClient();
  return globalThis.htn26Prisma;
}
