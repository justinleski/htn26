import assert from "node:assert/strict";
import test from "node:test";
import {
  CampaignSchema,
  type AnalyzeEvidence,
  type GenerateCampaign,
} from "../src/schemas.js";
import {
  GenerationError,
  applyClaimDecisions,
  verifyClaimDecisions,
  createElasticEvidenceRetriever,
  createFixtureEvidenceRetriever,
  createMemoryPersistence,
  createPrismaCampaignPersistence,
  createScriptedModelClient,
  createBackboardModelClient,
  generateCampaign,
  FIXTURE_ADS,
  FIXTURE_PRODUCTS,
  FIXTURE_REVIEWS,
} from "../src/ai/index.js";
import type { ElasticDataClient, ElasticSearchResponse, EvidenceDocument } from "../src/elasticsearch/data-index.js";

const merchantId = "merchant-1";
const productId = "rain-jacket";

test("Backboard sends isolated requests and extracts JSON text", async (context) => {
  context.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.equal(url, "https://app.backboard.io/api/threads/messages");
    assert.equal(new Headers(options.headers).get("X-API-Key"), "test-key");
    const body = JSON.parse(String(options.body));
    assert.equal(body.content, "Evidence");
    assert.equal(body.system_prompt, "Analyze");
    assert.equal(body.memory, "off");
    assert.equal(body.web_search, "off");
    assert.equal(body.thread_id, undefined);
    assert.equal(body.llm_provider, "test-provider");
    assert.equal(body.model_name, "test-model");
    return Response.json({ content: '```json\n{"ok":true}\n```' });
  });
  const model = createBackboardModelClient({ apiKey: "test-key", provider: "test-provider", model: "test-model" });
  assert.deepEqual(await model.completeJson({ system: "Analyze", user: "Evidence" }), { ok: true });
});

test("Backboard supervision checks output without rescanning unchanged stage input", async (context) => {
  const assessments: number[] = [];
  context.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    assessments.push(body.content === "Evidence" ? 1 : 0);
    return Response.json({ content: '{"ok":true}' });
  });
  const model = createBackboardModelClient({
    apiKey: "test-key",
    gptZero: {
      async assess(text) {
        assert.equal(text, '{"ok":true}');
        return { aiProbability: 0.1 };
      },
    },
  });

  assert.deepEqual(await model.completeJson({ system: "Analyze", user: "Evidence" }), { ok: true });
  assert.deepEqual(assessments, [1]);
});

test("Backboard failures are safe and malformed model output is rejected", async (context) => {
  let response = new Response("private provider response", { status: 401 });
  context.mock.method(globalThis, "fetch", async () => response);
  const model = createBackboardModelClient({ apiKey: "test-key" });
  await assert.rejects(model.completeJson({ system: "Analyze", user: "Evidence" }), (error: unknown) => {
    assert.ok(error instanceof GenerationError);
    assert.equal(error.code, "provider_unavailable");
    assert.ok(!JSON.stringify(error).includes("private provider response"));
    return true;
  });
  response = Response.json({ content: "not JSON" });
  await assert.rejects(model.completeJson({ system: "Analyze", user: "Evidence" }), (error: unknown) => error instanceof GenerationError && error.code === "schema_parse");
  response = Response.json({ content: "LLM Error: Model is not supported." });
  await assert.rejects(model.completeJson({ system: "Analyze", user: "Evidence" }), (error: unknown) => error instanceof GenerationError && error.code === "provider_unavailable");
});

const analysis: AnalyzeEvidence = {
  merchantId,
  productId,
  findings: [
    {
      summary: "Waterproof-themed ads had stronger observed conversion than style-themed ads in the imported window.",
      supportingSourceIds: ["demo-ad-001", "demo-ad-003", "demo-review-001"],
      observedMetrics: {
        waterproofConversionRate: { value: 0.119230769230769 },
        styleConversionRate: { value: 0.0571428571428571 },
      },
      limitations: ["Imported demo attribution does not prove causation."],
    },
  ],
  limitations: ["Evidence is limited to the labelled demo dataset."],
};

function campaignDraft(overrides: Partial<GenerateCampaign> = {}): GenerateCampaign {
  return {
    merchantId,
    productId,
    objective: "Increase conversions by leading with verified wet-weather protection.",
    audience: "Commuters who buy rain gear for reliability first.",
    strategy: "Lead with waterproof proof points from reviews and higher-converting ads, then test a style-led variant.",
    hooks: [
      "Stay dry through the whole commute",
      "Sealed pockets for sudden downpours",
      "Packable protection when the forecast flips",
    ],
    captions: [
      "Reviewers stayed dry in heavy rain, so lead with protection, not just the silhouette.",
      "Sealed pockets kept phones dry on wet commutes.",
      "A light shell that still handled a sudden downpour.",
    ],
    variants: [
      {
        name: "A",
        content: "Stay dry through the whole commute",
        changedElement: "Primary hook",
        hypothesis: "Protection-first messaging may earn more clicks from utility-driven shoppers.",
      },
      {
        name: "B",
        content: "A clean silhouette for every forecast",
        changedElement: "Primary hook",
        hypothesis: "A style-led hook may change click-through relative to the protection-led control.",
      },
    ],
    supportingSourceIds: ["demo-ad-001", "demo-review-001"],
    assumptions: ["Shoppers in this set care about staying dry on commutes."],
    limitations: ["Results are observational and limited to the imported period."],
    ...overrides,
  };
}

function supportedClaims() {
  return {
    decisions: [
      {
        claim: "Stay dry through the whole commute",
        status: "supported",
        sourceIds: ["demo-ad-001", "demo-review-001"],
        reason: "Matching review and ad evidence describes staying dry in rain.",
      },
    ],
  };
}

test("fixture pack includes 2 products, 6 reviews, and 4 ads", () => {
  assert.equal(FIXTURE_PRODUCTS.length, 2);
  assert.equal(FIXTURE_REVIEWS.length, 6);
  assert.equal(FIXTURE_ADS.length, 4);
});

test("generateCampaign returns a valid campaign from fixtures", async () => {
  const persistence = createMemoryPersistence();
  const campaign = await generateCampaign({
    merchantId,
    productId,
    model: createScriptedModelClient([analysis, campaignDraft(), supportedClaims()]),
    persistence,
  });

  const parsed = CampaignSchema.parse(campaign);
  assert.equal(parsed.merchantId, merchantId);
  assert.equal(parsed.productId, productId);
  assert.equal(parsed.hooks.length, 3);
  assert.equal(parsed.captions.length, 3);
  assert.equal(parsed.variants.length, 2);
  assert.ok(parsed.supportingSourceIds.includes("demo-review-001"));
  assert.equal(persistence.runs[0]?.status, "succeeded");
  assert.equal(persistence.runs[0]?.campaignId, parsed.id);
  assert.equal(persistence.campaigns.length, 1);
});

test("blank unused rewrite fields do not reject supported campaign claims", async () => {
  for (const rewrittenClaim of ["", "   ", null]) {
    const persistence = createMemoryPersistence();
    const checks = supportedClaims();
    const result = await generateCampaign({ merchantId, productId, persistence,
      model: createScriptedModelClient([analysis, campaignDraft(), {
        decisions: checks.decisions.map((decision) => ({ ...decision, rewrittenClaim })),
      }]),
    });
    assert.equal(result.hooks[0], campaignDraft().hooks[0]);
    assert.equal(persistence.runs[0]?.status, "succeeded");
  }
});

test("requested rewrites still reject missing, blank, or null replacement text", async () => {
  for (const rewrittenClaim of [undefined, "", "   ", null]) {
    const persistence = createMemoryPersistence();
    await assert.rejects(generateCampaign({ merchantId, productId, persistence,
      model: createScriptedModelClient([analysis, campaignDraft(), { decisions: [{
        ...supportedClaims().decisions[0], status: "rewritten", rewrittenClaim,
      }] }]),
    }), (error: unknown) => error instanceof GenerationError && error.code === "schema_parse" && error.stage === "check-claims");
    assert.equal(persistence.campaigns.length, 0);
    assert.equal(persistence.runs[0]?.status, "failed");
  }
});

test("a variant omitted by the claim checker cannot retain an unverified rating", async () => {
  const persistence = createMemoryPersistence();
  const draft = campaignDraft();
  draft.variants[1]!.content = "Your ideal rain gear at a fantastic rating of 4.4 out of 5!";
  const campaign = await generateCampaign({ merchantId, productId, persistence,
    model: createScriptedModelClient([analysis, draft, supportedClaims()]),
  });
  assert.equal(campaign.hooks[0], draft.hooks[0]);
  assert.equal(campaign.variants[0]?.content, draft.variants[0]?.content);
  assert.ok(!campaign.variants[1]?.content.includes("4.4"));
  assert.ok(campaign.validationResults.some((row) => row.includes("did not review this complete copy")));
  assert.equal(persistence.campaigns[0]?.variants[1]?.content, campaign.variants[1]?.content);
});

test("reviewing a substring does not approve the rest of an advertising claim", async () => {
  const draft = campaignDraft();
  draft.hooks[0] = "Stay dry through the whole commute with a guaranteed 100% success rate";
  for (const status of ["supported", "unsupported", "rewritten"]) {
    const campaign = await generateCampaign({ merchantId, productId,
      model: createScriptedModelClient([analysis, draft, { decisions: [{
        ...supportedClaims().decisions[0], status,
        ...(status === "rewritten" ? { rewrittenClaim: "A reviewer stayed dry during a commute" } : {}),
      }] }]),
      persistence: createMemoryPersistence(),
    });
    assert.ok(!campaign.hooks[0]?.includes("100%"));
  }
});

test("overlapping unreviewed copy is completely removed before shorter replacements", async () => {
  const draft = campaignDraft();
  draft.hooks[1] = "Rain gear";
  draft.captions[1] = "Rain gear has a guaranteed 100% success rate";
  const campaign = await generateCampaign({ merchantId, productId,
    model: createScriptedModelClient([analysis, draft, supportedClaims()]),
    persistence: createMemoryPersistence(),
  });
  assert.ok(!campaign.captions[1]?.includes("100%"));
});

test("fake source IDs are rejected", async () => {
  const persistence = createMemoryPersistence();
  await assert.rejects(
    () =>
      generateCampaign({
        merchantId,
        productId,
        model: createScriptedModelClient([
          {
            ...analysis,
            findings: [
              {
                summary: "Invented finding",
                supportingSourceIds: ["totally-fake-id"],
                observedMetrics: {},
                limitations: ["none"],
              },
            ],
          },
        ]),
        persistence,
      }),
    (error: unknown) => {
      assert.ok(error instanceof GenerationError);
      assert.equal(error.code, "invalid_citations");
      return true;
    },
  );
  assert.equal(persistence.runs[0]?.status, "failed");
  assert.match(persistence.runs[0]?.errorDetails ?? "", /evidence that does not exist/i);
});

test("unsupported claims are flagged or removed", async () => {
  const persistence = createMemoryPersistence();
  const unsupported = "Clinically proven to cure colds in 24 hours";
  const campaign = await generateCampaign({
    merchantId,
    productId,
    model: createScriptedModelClient([
      analysis,
      campaignDraft({
        hooks: [unsupported, "Sealed pockets for sudden downpours", "Packable protection when the forecast flips"],
        captions: [unsupported, "Sealed pockets kept phones dry on wet commutes.", "A light shell that still handled a sudden downpour."],
      }),
      {
        decisions: [
          {
            claim: unsupported,
            status: "unsupported",
            sourceIds: [],
            reason: "No supplied review or ad supports a medical cure claim.",
          },
        ],
      },
    ]),
    persistence,
  });

  assert.equal(campaign.hooks.includes(unsupported), false);
  assert.equal(campaign.captions.includes(unsupported), false);
  assert.ok(campaign.validationResults.some((row) => row.startsWith("unsupported:")));
});

test("rewritten claims replace the original wording", () => {
  const next = applyClaimDecisions(
    campaignDraft({
      hooks: ["Guaranteed 100% waterproof forever", "Sealed pockets for sudden downpours", "Packable protection when the forecast flips"],
    }),
    [
      {
        claim: "Guaranteed 100% waterproof forever",
        status: "rewritten",
        sourceIds: ["demo-review-001"],
        reason: "Guarantee is not in evidence.",
        rewrittenClaim: "Reviewers stayed dry in heavy rain",
      },
    ],
  );
  assert.equal(next.hooks[0], "Reviewers stayed dry in heavy rain");
});

test("claim rewrites without valid evidence are rejected instead of accepted", () => {
  const decisions = verifyClaimDecisions([{ claim: "Guaranteed protection", status: "rewritten", rewrittenClaim: "Certified protection", sourceIds: ["invented"], reason: "Changed wording" }], new Set(["real-source"]));
  assert.equal(decisions[0]?.status, "unsupported");
  assert.deepEqual(decisions[0]?.sourceIds, []);
  assert.deepEqual(verifyClaimDecisions([], new Set(["real-source"])), []);
});

test("zero-hang failure path works if the text provider is down", async () => {
  const persistence = createMemoryPersistence();
  const started = Date.now();
  await assert.rejects(
    () =>
      generateCampaign({
        merchantId,
        productId,
        model: {
          async completeJson() {
            return new Promise(() => {});
          },
        },
        persistence,
        timeoutMs: 40,
        retryAttempts: 2,
        retryDelayMs: 0,
      }),
    (error: unknown) => {
      assert.ok(error instanceof GenerationError);
      assert.equal(error.code, "timeout");
      assert.match(error.userMessage, /timed out/i);
      return true;
    },
  );
  assert.ok(Date.now() - started < 1_000);
  assert.equal(persistence.runs[0]?.status, "failed");
  assert.match(persistence.runs[0]?.errorDetails ?? "", /timed out/i);
});

test("schema parse failures fail the run with a user-visible error", async () => {
  const persistence = createMemoryPersistence();
  await assert.rejects(
    () =>
      generateCampaign({
        merchantId,
        productId,
        model: createScriptedModelClient([{ unexpected: true }]),
        persistence,
      }),
    (error: unknown) => {
      assert.ok(error instanceof GenerationError);
      assert.equal(error.code, "schema_parse");
      return true;
    },
  );
  assert.equal(persistence.runs[0]?.status, "failed");
  assert.match(persistence.runs[0]?.errorDetails ?? "", /unexpected format/i);
});

test("elastic retrieval keeps the same generateCampaign contract", async () => {
  const documents: EvidenceDocument[] = [
    { ...FIXTURE_PRODUCTS[0]!, recordType: "product", sourceRecordId: FIXTURE_PRODUCTS[0]!.shopifyId },
    { ...FIXTURE_REVIEWS[0]!, recordType: "review", sourceRecordId: FIXTURE_REVIEWS[0]!.sourceId },
    { ...FIXTURE_ADS[0]!, recordType: "ad", sourceRecordId: FIXTURE_ADS[0]!.sourceId },
  ];
  const elastic: ElasticDataClient = {
    async bulk() {
      return { errors: false };
    },
    async search<T>(): Promise<ElasticSearchResponse<T>> {
      return { hits: { hits: documents.map((document) => ({ _id: document.id, _source: document as T })) } };
    },
  };
  const persistence = createMemoryPersistence();
  const campaign = await generateCampaign({
    merchantId,
    productId,
    model: createScriptedModelClient([analysis, campaignDraft(), supportedClaims()]),
    persistence,
    retrieveEvidence: createElasticEvidenceRetriever(elastic),
  });
  assert.equal(CampaignSchema.parse(campaign).productId, productId);
});

test("fixture retriever scopes evidence to merchant and product", async () => {
  const retrieved = await createFixtureEvidenceRetriever()({ merchantId, productId: "daypack" });
  assert.equal(retrieved.product.id, "daypack");
  assert.equal(retrieved.reviews.length, 0);
  assert.equal(retrieved.ads.length, 0);
});

test("Prisma campaign persistence writes GenerationRun and Campaign", async () => {
  const runs: Array<Record<string, unknown>> = [];
  const campaigns: Array<Record<string, unknown>> = [];
  const client = {
    generationRun: {
      async create(args: { data: Record<string, unknown> }) {
        const record = { ...args.data };
        runs.push(record);
        return record;
      },
      async update(args: { where: { id: string }; data: Record<string, unknown> }) {
        const current = runs.find((run) => run.id === args.where.id);
        assert.ok(current);
        Object.assign(current, args.data);
        return current;
      },
    },
    campaign: {
      async create(args: { data: Record<string, unknown> }) {
        campaigns.push(args.data);
        return args.data;
      },
    },
  };
  const persistence = createPrismaCampaignPersistence(client);
  const run = await persistence.createGenerationRun({ merchantId });
  const campaign = await persistence.createCampaign({
    merchantId,
    productId,
    objective: "Increase conversions",
    audience: "Commuters",
    strategy: "Lead with waterproof proof.",
    hooks: ["h1", "h2", "h3"],
    captions: ["c1", "c2", "c3"],
    variants: [
      { name: "A", content: "h1", changedElement: "hook", hypothesis: "Utility copy wins." },
      { name: "B", content: "h2", changedElement: "hook", hypothesis: "Style copy changes CTR." },
    ],
    supportingSourceIds: ["demo-review-001"],
    validationResults: ["supported: stayed dry"],
  });
  const finished = await persistence.finishGenerationRun({
    id: run.id,
    status: "succeeded",
    campaignId: campaign.id,
  });
  assert.equal(finished.status, "succeeded");
  assert.equal(finished.campaignId, campaign.id);
  assert.equal(campaigns.length, 1);
  assert.ok(runs[0]?.startedAt instanceof Date);
});
