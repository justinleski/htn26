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
 * TODO(real AI): Replace the body below with a server-side call to the
 * OpenAI Responses API (stage 2 of the AI workflow: "Generate campaign"),
 * using Zod-validated structured output. Then run stage 3 ("Check claims")
 * against `insight` before returning variants to the client, flagging or
 * stripping any unsupported claims.
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
    },
    {
      id: "variant-b",
      label: "Variant B — Proof, Not Promises",
      hook: `"Bone dry after a full storm." That's not our line — that's a review.`,
      caption: `Customers keep telling us the same thing: the ${product.title} actually keeps them dry when it matters. So we're letting the reviews do the talking instead of another product shot.`,
      hashtags: ["#RealReviews", "#TestedInRain", "#SummitOutfitters"],
    },
    {
      id: "variant-c",
      label: "Variant C — Built For It",
      hook: `Style fades. Staying dry doesn't.`,
      caption: `The ${product.title} was engineered around one job: keeping the water out. Everything else — fit, weight, packability — was built around getting that one thing right.`,
      hashtags: ["#BuiltForIt", "#WaterproofGear", "#NoCompromise"],
    },
  ];
}
