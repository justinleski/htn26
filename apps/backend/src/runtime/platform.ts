import type { PrismaClient } from "@prisma/client";
import { createPrismaRepositories, type PrismaDataClient, type PrismaRepositories } from "../database/prisma-repositories.js";
import { ensureEvidenceIndex } from "../elasticsearch/data-index.js";
import { initializeSentry } from "../monitoring/sentry.js";
import { createElasticEvidenceClient, getElasticClient, type ElasticEvidenceClient } from "./elastic-client.js";
import { getPrismaClient } from "./prisma-client.js";

export interface PlatformServices {
  prisma: PrismaClient;
  repositories: PrismaRepositories;
  elastic: ElasticEvidenceClient;
}

export type DatabaseServices = Omit<PlatformServices, "elastic">;

let databaseServices: DatabaseServices | undefined;
let services: PlatformServices | undefined;

export function getDatabaseServices(): DatabaseServices {
  if (databaseServices) return databaseServices;
  initializeSentry();
  const prisma = getPrismaClient();
  databaseServices = {
    prisma,
    repositories: createPrismaRepositories(prisma as unknown as PrismaDataClient),
  };
  return databaseServices;
}

export function getPlatformServices(): PlatformServices {
  if (services) return services;
  const database = getDatabaseServices();
  services = {
    ...database,
    elastic: createElasticEvidenceClient(getElasticClient()),
  };
  return services;
}

export async function initializePlatform(): Promise<{ indexCreated: boolean }> {
  const platform = getPlatformServices();
  await platform.prisma.$queryRawUnsafe("SELECT 1");
  await platform.elastic.ping();
  const index = await ensureEvidenceIndex(platform.elastic);
  return { indexCreated: index.created };
}

export async function checkPlatformHealth(): Promise<{
  status: "ok" | "degraded";
  database: "ok" | "error";
  elasticsearch: "ok" | "error";
}> {
  let database: "ok" | "error" = "error";
  let elasticsearch: "ok" | "error" = "error";
  try {
    await getPrismaClient().$queryRawUnsafe("SELECT 1");
    database = "ok";
  } catch {
    database = "error";
  }
  try {
    const elastic = createElasticEvidenceClient(getElasticClient());
    if (await elastic.ping()) elasticsearch = "ok";
  } catch {
    elasticsearch = "error";
  }
  return {
    status: database === "ok" && elasticsearch === "ok" ? "ok" : "degraded",
    database,
    elasticsearch,
  };
}
