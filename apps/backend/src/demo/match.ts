import type { Product } from "../schemas.js";

export const DEMO_PRODUCT_ALIAS = "rain-jacket";
export const DEMO_PRODUCT_SHOPIFY_ID = "demo:rain-jacket";

export function isDemoShopifyId(shopifyId: string): boolean {
  return shopifyId.startsWith("demo:");
}

export function rainJacketMatchScore(
  product: Pick<Product, "title" | "shopifyId" | "attributes">,
): number {
  const handle = typeof product.attributes.handle === "string" ? product.attributes.handle : "";
  const productType =
    typeof product.attributes.productType === "string" ? product.attributes.productType : "";
  const haystack = `${product.title} ${handle} ${productType} ${product.shopifyId}`.toLowerCase();
  let score = 0;
  if (haystack.includes("rain")) score += 2;
  if (haystack.includes("jacket")) score += 2;
  if (haystack.includes("waterproof") || haystack.includes("shell")) score += 1;
  if (handle === DEMO_PRODUCT_ALIAS || product.shopifyId.includes(DEMO_PRODUCT_ALIAS)) score += 3;
  return score;
}

export function pickRainJacketProduct<T extends Pick<Product, "id" | "title" | "shopifyId" | "attributes">>(
  products: T[],
): T | undefined {
  const ranked = products
    .map((product) => ({ product, score: rainJacketMatchScore(product) }))
    .filter((entry) => entry.score >= 2)
    .sort((left, right) => right.score - left.score);
  return ranked[0]?.product;
}
