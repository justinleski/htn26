/**
 * Load apps/backend/.env before other server modules read process.env.
 * Vite/Shopify CLI already inject env in `dev`; this is for tsx scripts.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = [resolve(process.cwd(), ".env"), resolve(import.meta.dirname, "../.env")].find(existsSync);
if (envPath && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envPath);
}
