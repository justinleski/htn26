/**
 * Offline health probe — no HTTP server required.
 * Run: npm run check:health -w @htn26/backend
 */
import "./load-env";
import { checkDatabaseHealth } from "../app/db.server";
import { checkElasticHealth } from "../app/lib/elastic.server";
import { checkSentryHealth } from "../app/lib/sentry.server";
import { getEnv, hasShopifyCredentials } from "../app/lib/env.server";
import { DomainSchemas } from "../app/lib/schemas";
import { gaConnectStatus } from "../app/lib/ga/client.server";

async function main() {
  const env = getEnv();
  const [database, elastic] = await Promise.all([
    checkDatabaseHealth(),
    checkElasticHealth(),
  ]);
  const sentry = checkSentryHealth();
  const ga = gaConnectStatus(env);

  const report = {
    schemas: Object.keys(DomainSchemas),
    shopifyConfigured: hasShopifyCredentials(env),
    databaseConfigured: Boolean(env.databaseUrl),
    database,
    googleOAuth: ga,
    elastic,
    sentry,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!report.shopifyConfigured || !database.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
