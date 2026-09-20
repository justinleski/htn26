import type { CampaignVariant, Insight, Product } from "./types";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Shown by the campaign-generating UI while generateCampaign() is in flight.
export const CAMPAIGN_GENERATION_STATUS_LINES = [
  "Cross-referencing reviews with ad performance...",
  "Isolating the messaging themes that drive conversions...",
  "Drafting hooks and captions from the strongest evidence...",
  "Checking generated claims against your store data...",
];

export interface GenerateCampaignInput {
  product: Product;
  insight: Insight;
}

/**
 * Generates 3 editable campaign variants (hook, caption, hashtags) from a
 * product and the insight backing it.
 *
 * Illustrative fixture for the creative demo. Live campaigns use /api/generate,
 * backed by the server's generic TextGenerator interface and Backboard adapter.
 */
export async function generateCampaign(
  input: GenerateCampaignInput,
): Promise<CampaignVariant[]> {
  await delay(2800);

  const { product } = input;

  return [
    {
      id: "variant-a",
      label: "Variant A — Stay Dry Guarantee",
      hook: `Rain doesn't stand a chance against the ${product.title}.`,
      caption: `We built the ${product.title} for the days you can't reschedule. Fully seam-sealed, tested in real downpours, and backed by customers who stayed bone dry. Waterproofing isn't a feature here — it's the whole point.`,
      hashtags: ["#StayDry", "#RainReady", "#WaterproofGear"],
      mediaRecommendations: [
        "Film in real rain or a controlled water test — show water beading and rolling off the fabric.",
        "Get a close-up on the seams and zippers to make the waterproofing visible, not just claimed.",
        "End on the customer stepping into a warm, dry space to land the payoff.",
      ],
    },
    {
      id: "variant-b",
      label: "Variant B — Proof, Not Promises",
      hook: `"Bone dry after a full storm." That's not our line — that's a review.`,
      caption: `Customers keep telling us the same thing: the ${product.title} actually keeps them dry when it matters. So we're letting the reviews do the talking instead of another product shot.`,
      hashtags: ["#RealReviews", "#TestedInRain", "#SummitOutfitters"],
      mediaRecommendations: [
        "Overlay the actual review text on screen as it's read aloud or shown.",
        "Shoot handheld, UGC-style footage — it should feel like a customer's video, not a studio ad.",
        "Show the jacket in the same kind of weather the reviewer described, not a sunny backdrop.",
      ],
    },
    {
      id: "variant-c",
      label: "Variant C — Built For It",
      hook: `Style fades. Staying dry doesn't.`,
      caption: `The ${product.title} was engineered around one job: keeping the water out. Everything else — fit, weight, packability — was built around getting that one thing right.`,
      hashtags: ["#BuiltForIt", "#WaterproofGear", "#NoCompromise"],
      mediaRecommendations: [
        "Use quick cuts on functional details — zippers, seams, fit — instead of lingering fashion shots.",
        "A before/after or side-by-side against a non-waterproof jacket makes the point without saying it.",
        "Keep the pacing brisk; this variant sells substance, so let the product do the talking.",
      ],
    },
  ];
}
