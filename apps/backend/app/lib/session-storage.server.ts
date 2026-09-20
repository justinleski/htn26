import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "../db.server";

/** Shared Prisma session store for embedded helpers and standalone OAuth. */
export const sessionStorage = new PrismaSessionStorage(prisma);
