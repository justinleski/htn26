import {
  CampaignSchema,
  GenerationRunSchema,
  type Campaign,
  type GenerationRun,
} from "../schemas.js";

export interface CampaignPersistence {
  createGenerationRun(input: {
    merchantId: string;
    startedAt?: string;
  }): Promise<GenerationRun>;
  finishGenerationRun(input: {
    id: string;
    status: "succeeded" | "failed";
    completedAt?: string;
    errorDetails?: string | null;
    campaignId?: string | null;
  }): Promise<GenerationRun>;
  createCampaign(input: Omit<Campaign, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Campaign>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

export function createMemoryPersistence(): CampaignPersistence & {
  runs: GenerationRun[];
  campaigns: Campaign[];
} {
  const runs: GenerationRun[] = [];
  const campaigns: Campaign[] = [];
  return {
    runs,
    campaigns,
    async createGenerationRun(input) {
      const run = GenerationRunSchema.parse({
        id: newId(),
        merchantId: input.merchantId,
        status: "pending",
        startedAt: input.startedAt ?? nowIso(),
        completedAt: null,
        errorDetails: null,
        campaignId: null,
      });
      runs.push(run);
      return run;
    },
    async finishGenerationRun(input) {
      const index = runs.findIndex((run) => run.id === input.id);
      if (index < 0) throw new Error(`Generation run ${input.id} was not found.`);
      const current = runs[index]!;
      const next = GenerationRunSchema.parse({
        ...current,
        status: input.status,
        completedAt: input.completedAt ?? nowIso(),
        errorDetails: input.errorDetails ?? null,
        campaignId: input.campaignId ?? current.campaignId,
      });
      runs[index] = next;
      return next;
    },
    async createCampaign(input) {
      const stamp = nowIso();
      const campaign = CampaignSchema.parse({
        ...input,
        id: input.id ?? newId(),
        createdAt: stamp,
        updatedAt: stamp,
      });
      campaigns.push(campaign);
      return campaign;
    },
  };
}

interface PrismaCampaignDelegate {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
}

interface PrismaGenerationRunDelegate {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
}

export interface PrismaCampaignClient {
  campaign: PrismaCampaignDelegate;
  generationRun: PrismaGenerationRunDelegate;
}

function dateValue(value: unknown, field: string): string {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date database value for ${field}`);
  return date.toISOString();
}

function normalizeRun(record: Record<string, unknown>): GenerationRun {
  return GenerationRunSchema.parse({
    ...record,
    startedAt: dateValue(record.startedAt, "startedAt"),
    completedAt: record.completedAt == null ? null : dateValue(record.completedAt, "completedAt"),
    errorDetails: record.errorDetails ?? null,
    campaignId: record.campaignId ?? null,
  });
}

function normalizeCampaign(record: Record<string, unknown>): Campaign {
  return CampaignSchema.parse({
    ...record,
    createdAt: dateValue(record.createdAt, "createdAt"),
    updatedAt: dateValue(record.updatedAt, "updatedAt"),
  });
}

export function createPrismaCampaignPersistence(client: PrismaCampaignClient): CampaignPersistence {
  return {
    async createGenerationRun(input) {
      const startedAt = new Date(input.startedAt ?? nowIso());
      const record = await client.generationRun.create({
        data: {
          id: newId(),
          merchantId: input.merchantId,
          status: "pending",
          startedAt,
          completedAt: null,
          errorDetails: null,
          campaignId: null,
        },
      });
      return normalizeRun(record);
    },
    async finishGenerationRun(input) {
      const record = await client.generationRun.update({
        where: { id: input.id },
        data: {
          status: input.status,
          completedAt: new Date(input.completedAt ?? nowIso()),
          errorDetails: input.errorDetails ?? null,
          campaignId: input.campaignId ?? null,
        },
      });
      return normalizeRun(record);
    },
    async createCampaign(input) {
      const stamp = new Date();
      const record = await client.campaign.create({
        data: {
          id: input.id ?? newId(),
          merchantId: input.merchantId,
          productId: input.productId,
          objective: input.objective,
          audience: input.audience,
          strategy: input.strategy,
          hooks: input.hooks,
          captions: input.captions,
          variants: input.variants,
          supportingSourceIds: input.supportingSourceIds,
          validationResults: input.validationResults,
          createdAt: stamp,
          updatedAt: stamp,
        },
      });
      return normalizeCampaign(record);
    },
  };
}
