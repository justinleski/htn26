import type { CreativeExperiment } from "./types";

// Demo dataset: sequential creative testing for the Summit Waterproof Rain
// Jacket (p1). Round 1 isolates caption, round 2 locks in the winning
// caption and isolates media, round 3 locks in both winners and isolates
// hashtags. Conversion rates are spread so each round has one obvious
// winner, matching the "isolate one variable, lock in the winner" funnel.

const LOCKED_MEDIA = "/mock/creative/rain-jacket-lifestyle-walk.mp4";
const LOCKED_HASHTAGS = ["#RainGear", "#OutdoorEssentials", "#SummitOutfitters"];

export const creativeExperiment: CreativeExperiment = {
  productId: "p1",
  rounds: [
    {
      round: 1,
      variedDimension: "caption",
      locked: { mediaAssetUrl: LOCKED_MEDIA, hashtags: LOCKED_HASHTAGS },
      variants: [
        {
          id: "r1-waterproof",
          caption: "Watch it shrug off a downpour without missing a step.",
          captionTheme: "waterproof",
          mediaType: "video",
          mediaAssetUrl: LOCKED_MEDIA,
          hashtags: LOCKED_HASHTAGS,
          ctr: 0.048,
          ctaClicks: 620,
          conversionRate: 0.152,
        },
        {
          id: "r1-style",
          caption: "Rain-ready design that still looks sharp on the street.",
          captionTheme: "style",
          mediaType: "video",
          mediaAssetUrl: LOCKED_MEDIA,
          hashtags: LOCKED_HASHTAGS,
          ctr: 0.041,
          ctaClicks: 480,
          conversionRate: 0.052,
        },
        {
          id: "r1-durability",
          caption: "Built to survive years of storms, not just one.",
          captionTheme: "durability",
          mediaType: "video",
          mediaAssetUrl: LOCKED_MEDIA,
          hashtags: LOCKED_HASHTAGS,
          ctr: 0.039,
          ctaClicks: 455,
          conversionRate: 0.061,
        },
        {
          id: "r1-comfort",
          caption: "Stay comfortable and dry no matter how long you're out.",
          captionTheme: "comfort",
          mediaType: "video",
          mediaAssetUrl: LOCKED_MEDIA,
          hashtags: LOCKED_HASHTAGS,
          ctr: 0.036,
          ctaClicks: 410,
          conversionRate: 0.048,
        },
      ],
    },
    {
      round: 2,
      variedDimension: "media",
      locked: {
        caption: "Watch it shrug off a downpour without missing a step.",
        hashtags: LOCKED_HASHTAGS,
      },
      variants: [
        {
          id: "r2-storm-test",
          caption: "Watch it shrug off a downpour without missing a step.",
          captionTheme: "waterproof",
          mediaType: "video",
          mediaAssetUrl: "/mock/creative/rain-jacket-storm-test.mp4",
          hashtags: LOCKED_HASHTAGS,
          ctr: 0.055,
          ctaClicks: 710,
          conversionRate: 0.171,
        },
        {
          id: "r2-studio-shot",
          caption: "Watch it shrug off a downpour without missing a step.",
          captionTheme: "waterproof",
          mediaType: "image",
          mediaAssetUrl: "/mock/creative/rain-jacket-studio-shot.jpg",
          hashtags: LOCKED_HASHTAGS,
          ctr: 0.037,
          ctaClicks: 390,
          conversionRate: 0.058,
        },
        {
          id: "r2-city-walk",
          caption: "Watch it shrug off a downpour without missing a step.",
          captionTheme: "waterproof",
          mediaType: "video",
          mediaAssetUrl: "/mock/creative/rain-jacket-city-walk.mp4",
          hashtags: LOCKED_HASHTAGS,
          ctr: 0.040,
          ctaClicks: 430,
          conversionRate: 0.064,
        },
        {
          id: "r2-seam-closeup",
          caption: "Watch it shrug off a downpour without missing a step.",
          captionTheme: "waterproof",
          mediaType: "image",
          mediaAssetUrl: "/mock/creative/rain-jacket-seam-closeup.jpg",
          hashtags: LOCKED_HASHTAGS,
          ctr: 0.042,
          ctaClicks: 465,
          conversionRate: 0.071,
        },
      ],
    },
    {
      round: 3,
      variedDimension: "hashtags",
      locked: {
        caption: "Watch it shrug off a downpour without missing a step.",
        mediaAssetUrl: "/mock/creative/rain-jacket-storm-test.mp4",
      },
      variants: [
        {
          id: "r3-stay-dry",
          caption: "Watch it shrug off a downpour without missing a step.",
          captionTheme: "waterproof",
          mediaType: "video",
          mediaAssetUrl: "/mock/creative/rain-jacket-storm-test.mp4",
          hashtags: ["#StayDry", "#WaterproofGear", "#RainReady"],
          ctr: 0.057,
          ctaClicks: 735,
          conversionRate: 0.178,
        },
        {
          id: "r3-ootd",
          caption: "Watch it shrug off a downpour without missing a step.",
          captionTheme: "waterproof",
          mediaType: "video",
          mediaAssetUrl: "/mock/creative/rain-jacket-storm-test.mp4",
          hashtags: ["#OOTD", "#RainyDayStyle", "#NewDrop"],
          ctr: 0.044,
          ctaClicks: 460,
          conversionRate: 0.061,
        },
        {
          id: "r3-adventure",
          caption: "Watch it shrug off a downpour without missing a step.",
          captionTheme: "waterproof",
          mediaType: "video",
          mediaAssetUrl: "/mock/creative/rain-jacket-storm-test.mp4",
          hashtags: ["#OutdoorGear", "#AdventureReady", "#GearUp"],
          ctr: 0.046,
          ctaClicks: 495,
          conversionRate: 0.069,
        },
      ],
    },
  ],
};

export function getMockCreativeExperiment(_productId?: string): CreativeExperiment {
  return creativeExperiment;
}
