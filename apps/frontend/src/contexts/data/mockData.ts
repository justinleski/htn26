import type { AdPerformance, Product, Review } from "./types";

// Demo dataset: a rain-jacket merchant. Shaped as the drop-in replacement
// target for real Shopify (products), review-platform (reviews), and
// Google/Meta Ads (adPerformance) API responses.

export const storeName = "Summit Outfitters";

export const products: Product[] = [
  {
    id: "p1",
    title: "Summit Waterproof Rain Jacket",
    price: 128,
    currency: "USD",
    tags: ["waterproof", "outdoor"],
  },
  {
    id: "p2",
    title: "Urban Style Rain Jacket",
    price: 98,
    currency: "USD",
    tags: ["style", "urban"],
  },
  {
    id: "p3",
    title: "Packable Windbreaker",
    price: 64,
    currency: "USD",
    tags: ["packable", "lightweight"],
  },
  {
    id: "p4",
    title: "All-Weather Parka",
    price: 154,
    currency: "USD",
    tags: ["waterproof", "warm"],
  },
];

export const reviews: Review[] = [
  {
    id: "r1",
    productId: "p1",
    rating: 5,
    text: "Wore this through a full day of Seattle rain and stayed completely dry. The waterproofing is no joke.",
    source: "Shopify",
    date: "2026-06-02",
    themes: ["waterproofing"],
  },
  {
    id: "r2",
    productId: "p1",
    rating: 5,
    text: "Kept me dry on a backpacking trip in a downpour. Best rain shell I've owned.",
    source: "Judge.me",
    date: "2026-05-18",
    themes: ["waterproofing", "durability"],
  },
  {
    id: "r3",
    productId: "p2",
    rating: 4,
    text: "Love how this looks with everything, gets compliments constantly. Wish it held up better in heavy rain.",
    source: "Shopify",
    date: "2026-05-30",
    themes: ["style"],
  },
  {
    id: "r4",
    productId: "p4",
    rating: 5,
    text: "Bone dry after a full shift outside in a storm. Waterproofing is the reason I bought this.",
    source: "Judge.me",
    date: "2026-06-10",
    themes: ["waterproofing"],
  },
  {
    id: "r5",
    productId: "p3",
    rating: 4,
    text: "Packs down tiny, great for travel. Held up fine but I wouldn't call it fully waterproof.",
    source: "Shopify",
    date: "2026-04-22",
    themes: ["packability", "durability"],
  },
];

export const adPerformance: AdPerformance[] = [
  {
    id: "a1",
    productId: "p1",
    name: "Summit — Stay Dry Guarantee",
    theme: "waterproof",
    mediaType: "video",
    caption: "Watch it shrug off a downpour without missing a step.",
    hashtags: ["#StayDry", "#WaterproofGear"],
    // Genuinely divergent: crushes it on Instagram, falls flat on Google.
    platformBreakdown: [
      { platform: "Instagram", ctr: 0.058, ctaClicks: 640, conversionRate: 0.182, spend: 2200 },
      { platform: "Google", ctr: 0.021, ctaClicks: 180, conversionRate: 0.045, spend: 1800 },
    ],
  },
  {
    id: "a2",
    productId: "p1",
    name: "Summit — Street Style",
    theme: "style",
    mediaType: "video",
    caption: "Rain-ready design that still looks sharp on the street.",
    hashtags: ["#RainyDayStyle", "#OOTD"],
    platformBreakdown: [
      { platform: "Facebook", ctr: 0.041, ctaClicks: 480, conversionRate: 0.052, spend: 3800 },
    ],
  },
  {
    id: "a3",
    productId: "p4",
    name: "Parka — Built for Storms",
    theme: "waterproof",
    mediaType: "video",
    caption: "Built to keep the storm outside, every time.",
    hashtags: ["#AllWeather", "#WaterproofGear"],
    platformBreakdown: [
      { platform: "Google", ctr: 0.05, ctaClicks: 500, conversionRate: 0.15, spend: 1800 },
      { platform: "Facebook", ctr: 0.045, ctaClicks: 460, conversionRate: 0.115, spend: 1700 },
    ],
  },
  {
    id: "a4",
    productId: "p4",
    name: "Parka — Winter Fashion",
    theme: "style",
    mediaType: "video",
    caption: "Winter-ready style that doesn't quit when it rains.",
    hashtags: ["#WinterFashion", "#NewDrop"],
    platformBreakdown: [
      { platform: "Google", ctr: 0.03, ctaClicks: 1170, conversionRate: 0.0496, spend: 3200 },
    ],
  },
  {
    id: "a5",
    productId: "p2",
    name: "Urban — Look Sharp",
    theme: "style",
    mediaType: "image",
    caption: "Look sharp in the city, rain or shine.",
    hashtags: ["#UrbanStyle", "#OOTD"],
    platformBreakdown: [
      { platform: "TikTok", ctr: 0.05, ctaClicks: 1500, conversionRate: 0.05, spend: 2500 },
    ],
  },
  {
    id: "a6",
    productId: "p2",
    name: "Urban — Rain Ready",
    theme: "waterproof",
    mediaType: "video",
    caption: "City-ready and completely rain proof.",
    hashtags: ["#RainReady", "#WaterproofGear"],
    // Genuinely divergent: TikTok wins big, Facebook barely converts.
    platformBreakdown: [
      { platform: "TikTok", ctr: 0.06, ctaClicks: 700, conversionRate: 0.168, spend: 1400 },
      { platform: "Facebook", ctr: 0.025, ctaClicks: 210, conversionRate: 0.04, spend: 900 },
    ],
  },
  {
    id: "a7",
    productId: "p3",
    name: "Windbreaker — Pack Light",
    theme: "durability",
    mediaType: "image",
    caption: "Packs down tiny, holds up to everything.",
    hashtags: ["#PackLight", "#TravelGear"],
    platformBreakdown: [
      { platform: "Facebook", ctr: 0.04, ctaClicks: 800, conversionRate: 0.07, spend: 1600 },
    ],
  },
  {
    id: "a8",
    productId: "p3",
    name: "Windbreaker — All Season",
    theme: "waterproof",
    mediaType: "image",
    caption: "One shell, every season, always dry.",
    hashtags: ["#AllSeason", "#WaterproofGear"],
    platformBreakdown: [
      { platform: "Instagram", ctr: 0.045, ctaClicks: 550, conversionRate: 0.139, spend: 1200 },
      { platform: "Google", ctr: 0.04, ctaClicks: 440, conversionRate: 0.105, spend: 900 },
    ],
  },
];

export function getMockEvidence() {
  return { products, reviews, ads: adPerformance };
}
