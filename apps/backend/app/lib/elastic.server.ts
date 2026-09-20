/**
 * Elasticsearch client — light stub. Index/search owned by Dev 2.
 */
import { Client } from "@elastic/elasticsearch";
import { getEnv, hasElastic } from "./env.server";

let client: Client | null = null;

export function getElasticClient(): Client | null {
  const env = getEnv();
  if (!hasElastic(env)) return null;
  if (!client) {
    client = new Client({
      node: env.elasticUrl!,
      auth: { apiKey: env.elasticApiKey! },
    });
  }
  return client;
}

export type ElasticHealth = {
  configured: boolean;
  ok: boolean;
  status?: string;
  error?: string;
};

export async function checkElasticHealth(): Promise<ElasticHealth> {
  if (!hasElastic()) {
    return { configured: false, ok: false, error: "ELASTIC_URL / ELASTIC_API_KEY not set" };
  }
  try {
    const es = getElasticClient();
    if (!es) {
      return { configured: true, ok: false, error: "client unavailable" };
    }
    const result = await es.cluster.health({}, { requestTimeout: 5000 });
    return {
      configured: true,
      ok: true,
      status: String(result.status ?? "unknown"),
    };
  } catch (err) {
    return {
      configured: true,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
