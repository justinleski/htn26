// Shared data contracts. Shaped to match the future Shopify / Google Ads / Facebook
// Ads API responses so lib/mockData.ts can be swapped for a real fetch without
// touching consumers (hooks, pages, components).

export interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  imageUrl?: string;
  tags: string[];
}

export interface Review {
  id: string;
  productId: string;
  rating: number; // 1-5
  text: string;
  source: string;
  date: string; // ISO date
  themes: string[]; // extracted keywords, e.g. ["waterproofing"]
}

export type MessagingTheme =
  | "waterproof"
  | "style"
  | "durability"
  | "price"
  | "comfort";

export type Platform = "Instagram" | "Facebook" | "Google" | "TikTok";

// Per-platform stats for a single ad. The same creative can perform very
// differently across platforms (a video doing well on Instagram but poorly
// on Google), so these are never collapsed into one ad-level number by the
// data layer itself — callers decide how to represent an ad (best platform,
// spend-weighted average, etc).
export interface PlatformStat {
  platform: Platform;
  ctr: number; // 0-1
  ctaClicks: number;
  conversionRate: number; // 0-1
  spend: number;
}

export interface AdPerformance {
  id: string;
  productId: string;
  name: string;
  theme: MessagingTheme;
  mediaType: "video" | "image";
  caption: string;
  hashtags: string[];
  /** This creative's stats on each platform it ran on. Not every ad runs on every platform. */
  platformBreakdown: PlatformStat[];
}

export interface GenerationEvidence {
  products: Product[];
  reviews: Review[];
  ads: AdPerformance[];
}

export interface Insight {
  id: string;
  headline: string;
  explanation: string;
  supportingStat: string;
  sourceProductIds: string[];
  sourceAdIds: string[];
  limitations: string;
}

export interface RankedPerformanceItem {
  id: string;
  productId: string;
  name: string;
  theme: MessagingTheme;
  mediaType: AdPerformance["mediaType"];
  /** The platform whose stats are shown in ctr/conversionRate below. */
  bestPlatform: Platform;
  ctr: number; // 0-1
  conversionRate: number; // 0-1
  platformBreakdown: PlatformStat[];
}

export interface CampaignVariant {
  id: string;
  label: string;
  hook: string;
  caption: string;
  hashtags: string[];
}

// Sequential creative testing: isolate one creative variable per round,
// lock in the winner (by conversion rate), then test the next variable
// against that locked winner.

export interface Variant {
  id: string;
  caption: string;
  captionTheme: MessagingTheme;
  mediaType: "video" | "image";
  mediaAssetUrl: string;
  hashtags: string[];
  ctr: number; // 0-1
  ctaClicks: number;
  conversionRate: number; // 0-1
}

export type CreativeDimension = "caption" | "media" | "hashtags";

export interface TestRound {
  round: number;
  variedDimension: CreativeDimension;
  /** The creative attributes held constant for every variant in this round. */
  locked: Partial<Pick<Variant, "caption" | "mediaAssetUrl" | "hashtags">>;
  variants: Variant[];
  /** Computed by pickRoundWinner once variants exist; absent in raw/mock data. */
  winnerId?: string;
  /** Filled in by explainRoundWinner (AI call) after a winner is picked. */
  whyItWon?: string;
}

export interface CreativeExperiment {
  productId: string;
  rounds: TestRound[];
  /** Assembled from all three round winners once every round has one. */
  finalAd?: {
    caption: string;
    mediaAssetUrl: string;
    hashtags: string[];
  };
}
