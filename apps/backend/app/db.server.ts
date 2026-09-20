import "../scripts/load-env";
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const prisma = global.prismaGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

export type DatabaseHealth = {
  configured: boolean;
  ok: boolean;
  sessionTable?: boolean;
  sessionCount?: number;
  usesRailwayInternalHost?: boolean;
  error?: string;
};

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return { configured: false, ok: false, error: "DATABASE_URL not set" };
  }

  const usesRailwayInternalHost = databaseUrl.includes(".railway.internal");

  try {
    await prisma.$queryRaw`SELECT 1`;
    const sessionCount = await prisma.session.count();
    return {
      configured: true,
      ok: true,
      sessionTable: true,
      sessionCount,
      usesRailwayInternalHost,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      configured: true,
      ok: false,
      usesRailwayInternalHost,
      error: usesRailwayInternalHost
        ? `${message} — DATABASE_URL uses *.railway.internal, which is only reachable from Railway services. For local setup, use DATABASE_PUBLIC_URL (host like *.proxy.rlwy.net).`
        : message,
    };
  }
}

export default prisma;
