import { z } from "zod";

const id = z.string().trim().min(1);
const numberFromInput = (schema: z.ZodNumber) =>
  z.preprocess((value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value), schema);
const dateTimeFromInput = z.coerce.date().transform((value) => value.toISOString());

export const ReviewImportRowSchema = z.object({
  sourceId: id.optional(),
  productId: id,
  rating: numberFromInput(z.number().int().min(1).max(5)),
  text: z.string().trim().min(1),
  source: z.string().trim().min(1),
  reviewedAt: dateTimeFromInput,
});

export const AdPerformanceImportRowSchema = z
  .object({
    sourceId: id.optional(),
    productId: id,
    campaignId: id,
    messaging: z.string().trim().min(1),
    channel: z.string().trim().min(1),
    periodStart: dateTimeFromInput,
    periodEnd: dateTimeFromInput,
    impressions: numberFromInput(z.number().int().nonnegative()),
    clicks: numberFromInput(z.number().int().nonnegative()),
    purchases: numberFromInput(z.number().int().nonnegative()),
    spend: numberFromInput(z.number().nonnegative()),
    attributedRevenue: numberFromInput(z.number().nonnegative()),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
    source: z.string().trim().min(1),
  })
  .superRefine((row, context) => {
    if (row.periodEnd < row.periodStart) {
      context.addIssue({ code: "custom", path: ["periodEnd"], message: "periodEnd must be on or after periodStart" });
    }
    if (row.clicks > row.impressions) {
      context.addIssue({ code: "custom", path: ["clicks"], message: "clicks cannot exceed impressions" });
    }
    if (row.purchases > row.clicks) {
      context.addIssue({ code: "custom", path: ["purchases"], message: "purchases cannot exceed clicks" });
    }
  });

export type ReviewImportRow = z.infer<typeof ReviewImportRowSchema>;
export type AdPerformanceImportRow = z.infer<typeof AdPerformanceImportRowSchema>;
