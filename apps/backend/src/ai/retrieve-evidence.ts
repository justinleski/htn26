import { searchEvidence, type ElasticDataClient } from "../elasticsearch/data-index.js";
import { GenerationError } from "./errors.js";
import { splitEvidence, type EvidenceRecord } from "./evidence.js";
import { FIXTURE_ADS, FIXTURE_PRODUCTS, FIXTURE_REVIEWS } from "./fixtures.js";
import type { AdPerformance, Product, Review } from "../schemas.js";

export interface RetrievedEvidence {
  merchantId: string;
  productId: string;
  product: Product;
  reviews: Review[];
  ads: AdPerformance[];
  records: EvidenceRecord[];
}

export type EvidenceRetriever = (input: {
  merchantId: string;
  productId: string;
}) => Promise<RetrievedEvidence>;

function selectEvidence(
  merchantId: string,
  productId: string,
  records: EvidenceRecord[],
): RetrievedEvidence {
  const scoped = records.filter((record) => record.merchantId === merchantId);
  const { products, reviews, ads } = splitEvidence(scoped);
  const product = products.find((row) => row.id === productId);
  if (!product) {
    throw new GenerationError({
      code: "insufficient_evidence",
      stage: "retrieve",
      userMessage: "No product evidence was found for this item.",
    });
  }
  const productReviews = reviews.filter((row) => row.productId === productId);
  const productAds = ads.filter((row) => row.productId === productId);
  return {
    merchantId,
    productId,
    product,
    reviews: productReviews,
    ads: productAds,
    records: [product, ...productReviews, ...productAds],
  };
}

export function createFixtureEvidenceRetriever(): EvidenceRetriever {
  return async ({ merchantId, productId }) =>
    selectEvidence(merchantId, productId, [...FIXTURE_PRODUCTS, ...FIXTURE_REVIEWS, ...FIXTURE_ADS]);
}

export function createElasticEvidenceRetriever(client: ElasticDataClient): EvidenceRetriever {
  return async ({ merchantId, productId }) => {
    const documents = await searchEvidence({ client, merchantId, query: "", size: 200 });
    const records: EvidenceRecord[] = [];
    for (const document of documents) {
      if (document.recordType === "product") records.push(document);
      else if (document.recordType === "review") records.push(document);
      else if (document.recordType === "ad") records.push(document);
    }
    return selectEvidence(merchantId, productId, records);
  };
}

export async function retrieveEvidence(input: {
  merchantId: string;
  productId: string;
  elastic?: ElasticDataClient;
}): Promise<RetrievedEvidence> {
  const retriever = input.elastic
    ? createElasticEvidenceRetriever(input.elastic)
    : createFixtureEvidenceRetriever();
  return retriever({ merchantId: input.merchantId, productId: input.productId });
}
