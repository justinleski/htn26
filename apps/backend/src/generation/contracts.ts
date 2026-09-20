import { CampaignSchema } from "../schemas.js";

/** Provider output excludes identity, ownership, timestamps, and validation verdicts. */
export const CampaignDraftSchema = CampaignSchema.pick({
  objective: true,
  audience: true,
  strategy: true,
  hooks: true,
  captions: true,
  variants: true,
  supportingSourceIds: true,
}).strict();

export type CampaignDraft = import("zod").infer<typeof CampaignDraftSchema>;

/** Call after schema validation, before the separate claim-check and save stages. */
export function assertEvidenceReferences(
  draft: CampaignDraft,
  suppliedSourceIds: ReadonlySet<string>,
): void {
  if (draft.supportingSourceIds.length === 0 ||
    draft.supportingSourceIds.some((id) => !suppliedSourceIds.has(id))) {
    throw new Error("Campaign must cite only evidence supplied for this merchant and product.");
  }
}
