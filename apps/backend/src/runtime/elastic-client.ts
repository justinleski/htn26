import { Client } from "@elastic/elasticsearch";
import type {
  ElasticDataClient,
  ElasticIndexAdminClient,
  ElasticSearchResponse,
} from "../elasticsearch/data-index.js";
import { readElasticEnvironment } from "./environment.js";

export type ElasticEvidenceClient = ElasticDataClient & ElasticIndexAdminClient & {
  ping(): Promise<boolean>;
};

declare global {
  var htn26Elastic: Client | undefined;
}

export function createElasticClient(environment: NodeJS.ProcessEnv = process.env): Client {
  const config = readElasticEnvironment(environment);
  return new Client({
    node: config.url,
    auth: { apiKey: config.apiKey },
    maxRetries: 3,
    requestTimeout: 15_000,
  });
}

export function getElasticClient(): Client {
  if (!globalThis.htn26Elastic) globalThis.htn26Elastic = createElasticClient();
  return globalThis.htn26Elastic;
}

export function createElasticEvidenceClient(client: Client): ElasticEvidenceClient {
  return {
    async bulk(request) {
      const response = await client.bulk(request as never);
      return {
        errors: response.errors,
        items: response.items as never,
      };
    },
    async search<T>(request: Record<string, unknown>): Promise<ElasticSearchResponse<T>> {
      const response = await client.search<T>(request as never);
      return {
        hits: {
          hits: response.hits.hits.map((hit) => {
            if (!hit._id) throw new Error("Elasticsearch returned a hit without an ID");
            return {
              _id: hit._id,
              ...(typeof hit._score === "number" ? { _score: hit._score } : {}),
              _source: hit._source as T,
            };
          }),
        },
      };
    },
    indices: {
      async exists(request) {
        return client.indices.exists(request);
      },
      async create(request) {
        return client.indices.create(request as never);
      },
    },
    async ping() {
      return client.ping();
    },
  };
}
